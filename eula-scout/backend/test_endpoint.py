import urllib.request
import json

pdf_path = r'C:\Users\rejuveshj\AppData\Local\Temp\tmpypeecfor.pdf'
boundary = 'BOUNDARY1234567890'

with open(pdf_path, 'rb') as f:
    pdf_data = f.read()

part1 = (
    b'--' + boundary.encode() + b'\r\n'
    b'Content-Disposition: form-data; name="eulaFile"; filename="test.pdf"\r\n'
    b'Content-Type: application/pdf\r\n\r\n'
)
part2 = b'\r\n--' + boundary.encode() + b'\r\n'
part3 = b'Content-Disposition: form-data; name="company"\r\n\r\nTitan\r\n'
part4 = b'--' + boundary.encode() + b'--\r\n'

body = part1 + pdf_data + part2 + part3 + part4

req = urllib.request.Request(
    'http://localhost:5000/api/generate-pdf',
    data=body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary},
    method='POST'
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        print('Status:', resp.status)
        print('Content-Type:', resp.headers.get('Content-Type'))
        print('Size:', len(resp.read()), 'bytes - SUCCESS')
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    body_text = e.read().decode('utf-8', errors='replace')
    print('Body:', body_text)
except Exception as ex:
    print('Error:', type(ex).__name__, ex)
