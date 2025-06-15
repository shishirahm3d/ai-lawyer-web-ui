<?php
header("Content-Type: application/json");

// Get raw POST input
$input = json_decode(file_get_contents("php://input"), true);

// Validate input
if (!$input || !isset($input['messages']) || !isset($input['model']) || !isset($input['apiUrl'])) {
    echo json_encode(["success" => false, "error" => "Invalid input"]);
    exit;
}

// Build payload for Ollama
$payload = json_encode([
    "model" => $input['model'],
    "messages" => $input['messages'],
    "stream" => false,
    "options" => $input['parameters'] ?? []
]);

// Prepare HTTP request
$opts = [
    "http" => [
        "method"  => "POST",
        "header"  => "Content-Type: application/json",
        "content" => $payload,
        "timeout" => 20
    ]
];

$context = stream_context_create($opts);

// Send request to Ollama API
$response = @file_get_contents($input['apiUrl'], false, $context);

// Check for errors
if ($response === false) {
    echo json_encode(["success" => false, "error" => "Failed to connect to Ollama API"]);
    exit;
}

// Decode Ollama response
$data = json_decode($response, true);

// Validate response structure
if (!isset($data['message']['content'])) {
    echo json_encode(["success" => false, "error" => "Unexpected API response"]);
    exit;
}

// Send response back to frontend
echo json_encode([
    "success" => true,
    "response" => $data['message']['content']
]);
