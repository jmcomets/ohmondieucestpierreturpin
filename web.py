from flask import Flask, request, g, jsonify
from collections import Counter
import json

app = Flask('ohmondieucestpierreturpin')

@app.route('/')
def index():
    return app.send_static_file('index.html')

DATABASE = 'database.json'

def load_db():
    try:
        with open(DATABASE, 'r') as fp:
            return json.load(fp)
    except IOError:
        return {}

def save_db(db):
    if db:
        with open(DATABASE, 'w') as fp:
            json.dump(db, fp)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = load_db()
    return db

@app.route('/score', methods=['GET'])
def get_score():
    db_scores = get_db()['scores']
    scores = sorted(list(map(lambda x: x['score'], db_scores)))
    failed = Counter(map(lambda x: x['failed_at'], db_scores))
    top_scores = sorted(list(set(scores[-5:])), reverse=True)
    avg_score = int(sum(scores) / len(scores)) if scores else -1
    most_failed = list(map(lambda x: x[0], sorted(failed.most_common(5), key=lambda x: x[1], reverse=True)))
    return jsonify({
        'top_scores': top_scores,
        'average_score': avg_score,
        'most_failed': most_failed
        })

@app.route('/score', methods=['POST'])
def post_score():
    data = request.get_json()
    db = get_db()
    db.setdefault('scores', [])
    db['scores'].append(data)
    save_db(db)
    return ''

# TODO: remove
@app.route('/debug', methods=['POST'])
def debug():
    data = request.get_json()
    with open('data.json', 'w') as fp:
        json.dump(data, fp)
    return ''

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
