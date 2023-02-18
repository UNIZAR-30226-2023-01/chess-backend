curl \
    --location 'http://localhost:4000/api/v1/auth/sign-in' \
    --header 'Content-Type: application/json' \
    --data '{
        "username": "johndoe",
        "password": "qwerty"
    }'
