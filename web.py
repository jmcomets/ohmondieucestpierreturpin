from flask import Flask, request
import json

app = Flask('ohmondieucestpierreturpin')

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
