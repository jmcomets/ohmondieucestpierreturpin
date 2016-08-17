import json
from flask import Flask, request, g, jsonify, abort
from score import get_score_stats, add_score

app = Flask('ohmondieucestpierreturpin')

with open('settings.json') as fp:
    app.config['SETTINGS'] = json.load(fp)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/settings')
def get_settings():
    return jsonify(app.config['SETTINGS'])

@app.route('/score', methods=['GET'])
def get_score():
    return jsonify(get_score_stats())

@app.route('/score', methods=['POST'])
def post_score():
    data = request.get_json()
    try:
        final_score = int(data['final_score'])
        failed_at = int(data['failed_at'])
    except KeyError:
        return abort(400)
    try:
        add_score(final_score, failed_at)
    except ValueError:
        return abort(400)
    else:
        return ''

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
