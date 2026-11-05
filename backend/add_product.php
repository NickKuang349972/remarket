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

$title = trim($_POST['title'] ?? '');
$price = $_POST['price'] ?? '';
$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? '其他');
$address = trim($_POST['address'] ?? '');
$lat = $_POST['lat'] ?? '';
$lng = $_POST['lng'] ?? '';
$status = strtolower(trim($_POST['status'] ?? 'available'));
if (!in_array($status, ['available', 'sold'], true)) {
    $status = 'available';
}

$conditionLabel = trim($_POST['condition_label'] ?? '轻微使用痕迹');
$deliveryMethod = trim($_POST['delivery_method'] ?? '面交');
$isNegotiable = !empty($_POST['is_negotiable']) ? 1 : 0;

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

    $stmt = $pdo->prepare(
        "INSERT INTO products (title, price, description, category, address, lat, lng, status, condition_label, delivery_method, is_negotiable)
         VALUES (:title, :price, :description, :category, :address, :lat, :lng, :status, :condition_label, :delivery_method, :is_negotiable)"
    );

    $stmt->execute([
        ':title'           => $title,
        ':price'           => (int) $price,
        ':description'     => $description,
        ':category'        => $category,
        ':address'         => $address,
        ':lat'             => $lat,
        ':lng'             => $lng,
        ':status'          => $status,
        ':condition_label' => $conditionLabel,
        ':delivery_method' => $deliveryMethod,
        ':is_negotiable'   => $isNegotiable,
    ]);

    $productId = $pdo->lastInsertId();

    if (isset($_FILES['image']) && !empty($_FILES['image']['name'][0])) {
        $fileCount = count($_FILES['image']['name']);
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
        ];

        $imgStmt = $pdo->prepare("INSERT INTO product_images (product_id, path) VALUES (:product_id, :path)");

        for ($i = 0; $i < $fileCount; $i++) {
            if ($_FILES['image']['error'][$i] !== UPLOAD_ERR_OK) {
                continue;
            }

            if ($_FILES['image']['size'][$i] > 5 * 1024 * 1024) {
                continue;
            }

            $tmpName = $_FILES['image']['tmp_name'][$i];
            $mime = mime_content_type($tmpName);

            if (!isset($allowed[$mime])) {
                continue;
            }

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            $filename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];

            if (move_uploaded_file($tmpName, $uploadDir . '/' . $filename)) {
                $imagePath = 'uploads/' . $filename;
                $imgStmt->execute([
                    ':product_id' => $productId,
                    ':path'       => $imagePath
                ]);
            }
        }
    }

    $pdo->commit();
    respond('success', '商品刊登成功', ['id' => (int) $productId]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond('error', '資料庫錯誤：' . $e->getMessage());
}
