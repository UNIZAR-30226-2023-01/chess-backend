var headers = {
  'Content-Type': 'application/json'
};
var request = http.Request('POST', Uri.parse('http://localhost:4000/api/v1/auth/sign-up'));
request.body = json.encode({
  "username": "johndoe",
  "email": "johndoe@example.com",
  "password": "qwerty"
});
request.headers.addAll(headers);

http.StreamedResponse response = await request.send();

if (response.statusCode == 200) {
  print(await response.stream.bytesToString());
}
else {
  print(response.reasonPhrase);
}
