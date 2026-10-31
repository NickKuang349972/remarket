<?php
// 新增商品 API：接受 multipart/form-data（可附一張相片）
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

if ($title === '') {
    respond('error', '商品標題不能為空');
}
if (!is_numeric($price) || $price < 0) {
    respond('error', '價格必須是有效的數字');
}
if (!is_numeric($lat) || !is_numeric($lng)) {
    respond('error', '缺少有效的座標');
}

$imagePath = '';

if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        respond('error', '相片上傳失敗');
    }
    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        respond('error', '相片不能超過 5MB');
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];
    $mime = mime_content_type($_FILES['image']['tmp_name']);

    if (!isset($allowed[$mime])) {
        respond('error', '只支援 JPG / PNG / WEBP / GIF 格式');
    }

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0775, true);
    }

    $filename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];

    if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . '/' . $filename)) {
        respond('error', '無法儲存相片');
    }

    $imagePath = 'uploads/' . $filename;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare(
        "INSERT INTO products (title, price, description, category, address, image, lat, lng)
         VALUES (:title, :price, :description, :category, :address, :image, :lat, :lng)"
    );

    $stmt->execute([
        ':title'       => $title,
        ':price'       => (int) $price,
        ':description' => $description,
        ':category'    => $category,
        ':address'     => $address,
        ':image'       => $imagePath,
        ':lat'         => $lat,
        ':lng'         => $lng,
    ]);

    respond('success', '商品刊登成功', ['id' => (int) $pdo->lastInsertId()]);

} catch (PDOException $e) {
    respond('error', '資料庫錯誤：' . $e->getMessage());
}