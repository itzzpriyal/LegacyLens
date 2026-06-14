import requests
import zipfile
import io

zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
    zip_file.writestr('main.py', 'print("Hello world")')
zip_buffer.seek(0)

url = 'https://legacylens-787o.onrender.com/api/projects/upload'
files = {'file': ('test.zip', zip_buffer, 'application/zip')}
print('Sending request to', url)
response = requests.post(url, files=files)
print(f'Status: {response.status_code}')
print(f'Response: {response.text}')
