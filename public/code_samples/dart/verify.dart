var request = http.Request('POST', Uri.parse('http://localhost:4000/api/v1/auth/verify'));
request.body = '''''';

http.StreamedResponse response = await request.send();

if (response.statusCode == 200) {
  print(await response.stream.bytesToString());
}
else {
  print(response.reasonPhrase);
}
