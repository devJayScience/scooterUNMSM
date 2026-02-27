import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://nominatim.openstreetmap.org/search?q=Universidad+Nacional+Mayor+de+San+Marcos&format=json&polygon_geojson=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data[0]['geojson'], indent=2))
        print("Center:", data[0]['lat'], data[0]['lon'])
except Exception as e:
    print('Error:', e)
