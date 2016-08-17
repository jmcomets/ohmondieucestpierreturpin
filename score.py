import datetime
from peewee import Model, SqliteDatabase, IntegerField, DateTimeField, fn

__all__ = ('add_score', 'get_score_stats')

db = SqliteDatabase('scores.db')

class ScoreEntry(Model):
    created_at = DateTimeField(default=datetime.datetime.now)

    final_score = IntegerField()
    failed_at = IntegerField()

    class Meta:
        database = db

def add_score(final_score, failed_at):
    if final_score < 0 or failed_at not in range(1, 9 + 1):
        raise ValueError
    ScoreEntry.create(final_score=final_score, failed_at=failed_at)

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
    high_score, average_score = (ScoreEntry
                                 .select(fn.Max(ScoreEntry.final_score),
                                         fn.Avg(ScoreEntry.final_score))
                                 .scalar(as_tuple=True))
    if (high_score, average_score) == (None, None):
        high_score, average_score = 0, 0
    most_failed = get_most_failed()
    return {
            'high_score': high_score,
            'average_score': average_score,
            'most_failed': most_failed
            }

if __name__ == '__main__':
    db.create_tables([ScoreEntry])
