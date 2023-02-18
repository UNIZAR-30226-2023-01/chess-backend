curl \
    --location 'http://localhost:4000/api/v1/auth/sign-up' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "qwerty"
    }'
