<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$dbname = 'carousell_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $category = trim($_GET['category'] ?? '');

    if ($category !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, title, price, description, category, address, lat, lng, status, seller,
                    condition_label, delivery_method, is_negotiable
             FROM products WHERE category = :category ORDER BY id DESC"
        );
        $stmt->execute([':category' => $category]);
    } else {
        $stmt = $pdo->query(
            "SELECT id, title, price, description, category, address, lat, lng, status, seller,
                    condition_label, delivery_method, is_negotiable
             FROM products ORDER BY id DESC"
        );
    }

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as &$product) {
        $imgStmt = $pdo->prepare("SELECT path FROM product_images WHERE product_id = :product_id");
        $imgStmt->execute([':product_id' => $product['id']]);
        $imagePaths = $imgStmt->fetchAll(PDO::FETCH_COLUMN);

        $product['images'] = $imagePaths;
        $product['image'] = count($imagePaths) > 0 ? $imagePaths[0] : '';
    }
    unset($product);

    echo json_encode(["status" => "success", "data" => $products], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
