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

    // 撈出所有商品（包含圖片與座標，前端地圖和詳情頁需要）
    $stmt = $pdo->query("SELECT id, title, price, description, image, lat, lng FROM products ORDER BY id DESC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $products], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>