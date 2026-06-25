<?php
// Read the raw POST data
$input = file_get_contents('php://input');

// Decode the JSON payload
$data = json_decode($input, true);

// Log the payload for debugging (optional)
file_put_contents('webhook_log.txt', $input . PHP_EOL, FILE_APPEND);

// Example: handle a specific event type
if (isset($data['EventTypeId'])) {
    switch ($data['EventTypeId']) {
        case 1796: // Transaction Payment Created
            // Handle payment created event
            // You can access event data via $data['EventData']
            break;
        case 1798: // Transaction Failed
            // Handle payment failed event
            break;
        // Add more cases as needed
    }
}

// Always respond with 2xx status code
http_response_code(200);
echo json_encode(['message' => 'ok']);
?>