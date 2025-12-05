<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    // Apply CORS to all routes (you can later reduce this to ['api/*', 'sanctum/csrf-cookie'])
    'paths' => ['*'],

    // Allow all HTTP methods
    'allowed_methods' => ['*'],

    // Explicitly list allowed origins (your production + local dev)
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'https://princerto.in',
        'https://www.princerto.in',
    ],

    'allowed_origins_patterns' => [],

    // Allow all headers
    'allowed_headers' => ['*'],

    // Expose no custom headers (adjust if you need some)
    'exposed_headers' => [],

    // How long the results of a preflight request can be cached (seconds)
    'max_age' => 0,

    // If you send cookies/Authorization across origins, keep this true
    'supports_credentials' => true,

];
