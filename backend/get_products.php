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

    // 支援 ?category=電子產品 這種篩選（不帶就回傳全部）
    $category = trim($_GET['category'] ?? '');

    if ($category !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, title, price, description, category, address, image, lat, lng
             FROM products WHERE category = :category ORDER BY id DESC"
        );
        $stmt->execute([':category' => $category]);
    } else {
        $stmt = $pdo->query(
            "SELECT id, title, price, description, category, address, image, lat, lng
             FROM products ORDER BY id DESC"
        );
    }

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $products], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
