<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['messages']) || empty($input['messages'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No messages to save']);
    exit;
}

$messages = $input['messages'];

// Create chat directory if it doesn't exist
$chatDir = '../Intermediate-Chats';
if (!is_dir($chatDir)) {
    mkdir($chatDir, 0755, true);
}

// Generate a summary for the filename
$firstUserMessage = '';
foreach ($messages as $message) {
    if ($message['role'] === 'user') {
        $firstUserMessage = $message['content'];
        break;
    }
}

// Create a safe filename from the first user message
$summary = substr($firstUserMessage, 0, 50);
$summary = preg_replace('/[^a-zA-Z0-9\s]/', '', $summary);
$summary = trim($summary);
if (empty($summary)) {
    $summary = 'Chat_' . date('Y-m-d_H-i-s');
}

$filename = $summary . '_' . date('Y-m-d_H-i-s') . '.txt';
$filepath = $chatDir . '/' . $filename;

// Save the chat
$chatContent = '';
foreach ($messages as $message) {
    $content = str_replace("\n", "\\n", $message['content']);
    $chatContent .= $message['role'] . ': ' . $content . "\n";
}

if (file_put_contents($filepath, $chatContent) !== false) {
    echo json_encode(['success' => true, 'filename' => $filename]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save chat']);
}
?>
