from flask import Flask

app = Flask('ohmondieucestpierreturpin')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
