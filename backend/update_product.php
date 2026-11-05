<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

$uploadDir = __DIR__ . '/uploads';

function respond($status, $message, $extra = []) {
    echo json_encode(array_merge(["status" => $status, "message" => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond('error', '只接受 POST 請求');
}

$id = $_POST['id'] ?? '';
$title = trim($_POST['title'] ?? '');
$price = $_POST['price'] ?? '';
$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? '其他');
$address = trim($_POST['address'] ?? '');
$lat = $_POST['lat'] ?? '';
$lng = $_POST['lng'] ?? '';

$status = strtolower(trim($_POST['status'] ?? ''));
if ($status !== '' && !in_array($status, ['available', 'sold'], true)) {
    respond('error', '商品狀態不正確');
}

$conditionLabel = trim($_POST['condition_label'] ?? '');
$deliveryMethod = trim($_POST['delivery_method'] ?? '');
$isNegotiable = null;
if (isset($_POST['is_negotiable']) && $_POST['is_negotiable'] !== '') {
    $isNegotiable = !empty($_POST['is_negotiable']) ? 1 : 0;
}

if (!is_numeric($id)) {
    respond('error', '缺少商品編號');
}
if ($title === '') {
    respond('error', '商品標題不能為空');
}
if (!is_numeric($price) || $price < 0) {
    respond('error', '價格必須是有效的數字');
}
if (!is_numeric($lat) || !is_numeric($lng)) {
    respond('error', '缺少有效的座標');
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->beginTransaction();

    $check = $pdo->prepare("SELECT id FROM products WHERE id = :id");
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        $pdo->rollBack();
        http_response_code(404);
        respond('error', '找不到這件商品');
    }

    $sql = "UPDATE products
            SET title = :title, price = :price, description = :description,
                category = :category, address = :address, lat = :lat, lng = :lng";
    $params = [
        ':title'       => $title,
        ':price'       => (int) $price,
        ':description' => $description,
        ':category'    => $category,
        ':address'     => $address,
        ':lat'         => $lat,
        ':lng'         => $lng,
        ':id'          => $id,
    ];

    if ($status !== '') {
        $sql .= ", status = :status";
        $params[':status'] = $status;
    }

    if ($conditionLabel !== '') {
        $sql .= ", condition_label = :condition_label";
        $params[':condition_label'] = $conditionLabel;
    }

    if ($deliveryMethod !== '') {
        $sql .= ", delivery_method = :delivery_method";
        $params[':delivery_method'] = $deliveryMethod;
    }

    if ($isNegotiable !== null) {
        $sql .= ", is_negotiable = :is_negotiable";
        $params[':is_negotiable'] = $isNegotiable;
    }

    $sql .= " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $hasNewImages = false;
    if (isset($_FILES['image'])) {
        if (is_array($_FILES['image']['name']) && !empty($_FILES['image']['name'][0])) {
            $hasNewImages = true;
        } elseif (!is_array($_FILES['image']['name']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $hasNewImages = true;
        }
    }

    if ($hasNewImages) {
        $oldImgStmt = $pdo->prepare("SELECT path FROM product_images WHERE product_id = :id");
        $oldImgStmt->execute([':id' => $id]);
        $oldImages = $oldImgStmt->fetchAll(PDO::FETCH_COLUMN);

        $delImgStmt = $pdo->prepare("DELETE FROM product_images WHERE product_id = :id");
        $delImgStmt->execute([':id' => $id]);

        foreach ($oldImages as $oldPath) {
            if (!empty($oldPath) && str_starts_with($oldPath, 'uploads/')) {
                $oldFile = __DIR__ . '/' . $oldPath;
                if (is_file($oldFile)) {
                    unlink($oldFile);
                }
            }
        }

        $files = $_FILES['image'];
        $fileCount = is_array($files['name']) ? count($files['name']) : 1;
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        ];

        $insImgStmt = $pdo->prepare("INSERT INTO product_images (product_id, path) VALUES (:product_id, :path)");

        for ($i = 0; $i < $fileCount; $i++) {
            $error   = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            $size    = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];

            if ($error !== UPLOAD_ERR_OK || $size > 5 * 1024 * 1024) {
                continue;
            }

            $mime = mime_content_type($tmpName);
            if (!isset($allowed[$mime])) {
                continue;
            }

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            $filename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];

            if (move_uploaded_file($tmpName, $uploadDir . '/' . $filename)) {
                $insImgStmt->execute([
                    ':product_id' => $id,
                    ':path'       => 'uploads/' . $filename
                ]);
            }
        }
    }

    $pdo->commit();
    respond('success', '商品已更新');

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
