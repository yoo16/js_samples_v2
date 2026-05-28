<?php
session_start();
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? null;

if ($id && isset($_SESSION['cart'])) {
    unset($_SESSION['cart'][$id]); 
}

echo json_encode([
    'status' => 'success',
    'cart' => $_SESSION['cart'],
    'cartCount' => array_sum($_SESSION['cart'])
]);