from flask import Flask, request
import json

app = Flask('ohmondieucestpierreturpin')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/debug', methods=['POST'])
def debug():
    data = request.get_json()
    with open('data.json', 'w') as fp:
        json.dump(data, fp)
    return ''

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
