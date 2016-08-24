import os
from urllib.parse import urlparse
import datetime
from peewee import Model, IntegerField, DateTimeField, CharField, fn
from peewee import SqliteDatabase, PostgresqlDatabase

__all__ = ('add_score', 'get_score_stats')

try:
    database_url = os.environ['DATABASE_URL']
except KeyError:
    this_dir = os.path.dirname(os.path.realpath(__file__))
    db = SqliteDatabase(os.path.join(this_dir, 'scores.db'))
else:
    url = urlparse(database_url)
    db = PostgresqlDatabase(url.path[1:],
                            user=url.username,
                            password=url.password,
                            host=url.hostname,
                            port=url.port)

class ScoreEntry(Model):
    created_at = DateTimeField(default=datetime.datetime.now)

    final_score = IntegerField()
    failed_at = IntegerField()
    nickname = CharField(max_length=15)

    class Meta:
        database = db

    def __unicode__(self):
        return 'nickname={}, final_score={}, failed_at={}'.format(self.nickname, self.final_score, self.failed_at)

def add_score(nickname, final_score, failed_at):
    if final_score < 0 or failed_at not in range(1, 9 + 1):
        raise ValueError
    ScoreEntry.create(nickname=nickname, final_score=final_score, failed_at=failed_at)

def get_high_and_average_scores():
    high_score, average_score = (ScoreEntry
                                 .select(fn.Max(ScoreEntry.final_score),
                                         fn.Avg(ScoreEntry.final_score))
                                 .scalar(as_tuple=True))
    if (high_score, average_score) == (None, None):
        high_score, average_score = 0, 0
    return high_score, average_score

def get_high_score_holder():
    results = ScoreEntry.select(ScoreEntry.nickname, fn.Max(ScoreEntry.final_score))
    if results:
        return results[0].nickname

def get_fail_counts():
    for entry in (ScoreEntry
                  .select(ScoreEntry.failed_at,
                          fn.Count(ScoreEntry.failed_at)
                            .alias('count'))
                  .group_by(ScoreEntry.failed_at)):
        yield entry.failed_at, entry.count

def get_most_failed():
    return max(get_fail_counts(), key=lambda fc: fc[1], default=(-1, 0))[0]

def get_score_stats():
    high_score_holder = get_high_score_holder()
    high_score, average_score = get_high_and_average_scores()
    most_failed = get_most_failed()
    return {
            'high_score_holder': high_score_holder,
            'high_score': int(high_score),
            'average_score': float(average_score),
            'most_failed': int(most_failed)
            }

if __name__ == '__main__':
    db.create_tables([ScoreEntry])
