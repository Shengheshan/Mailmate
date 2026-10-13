import unittest
from cross_email_context import rank_related, build_context


def m(mid, subject, day, conv=None, sender="admin@unsw.edu.au", body="", **kw):
    return dict(message_id=mid, subject=subject, received_at=f"2026-10-{day:02d}T10:00:00Z",
                conversation_id=conv, sender={"email": sender}, recipients=[],
                body_text=body, **kw)


class CrossEmailTests(unittest.TestCase):
    def test_same_thread(self):
        old=m("1","Application deadline",1,conv="c1")
        new=m("2","Re: Application deadline",10,conv="c1")
        hit=rank_related(new,[old])[0]
        self.assertEqual(hit["relation"],"confirmed_thread")

    def test_cross_thread_same_transaction_candidate(self):
        old=m("1","COMP9414 assignment extension request",1,body="Extension application")
        new=m("2","Re: COMP9414 assignment extension request",10,body="Updated submission date")
        self.assertEqual(rank_related(new,[old])[0]["relation"],"candidate")

    def test_same_course_distinct_tasks_not_joined(self):
        old=m("1","COMP9414 lecture recording",1)
        new=m("2","COMP9414 assignment submission",10)
        self.assertEqual(rank_related(new,[old]),[])

    def test_unrelated_email(self):
        old=m("1","Library sale",1,sender="library@example.com")
        new=m("2","COMP9414 assignment",10)
        self.assertEqual(rank_related(new,[old]),[])

    def test_no_future_leakage(self):
        new=m("2","COMP9414 assignment",10,conv="c1")
        future=m("3","COMP9414 assignment",12,conv="c1")
        self.assertEqual(rank_related(new,[future]),[])

    def test_deadline_revision_context_preserves_sources(self):
        old=m("1","COMP9414 assignment deadline",1,conv="c1",body="Deadline October 15")
        new=m("2","Re: COMP9414 assignment deadline",10,conv="c1",body="Deadline extended to October 20")
        hits=rank_related(new,[old])
        context=build_context(new,hits)
        self.assertIn("Deadline October 15",context)
        self.assertIn("Deadline extended to October 20",context)
        self.assertIn("ID: 1",context)

    def test_reply_reference(self):
        old=m("1","Request details",1,internet_message_id="<ref1@example.com>",sender="x@example.com")
        new=m("2","Response",10,sender="y@example.com",internet_message_headers=[{"name":"In-Reply-To","value":"<ref1@example.com>"}])
        self.assertEqual(rank_related(new,[old])[0]["relation"],"confirmed_thread")


if __name__=="__main__":
    unittest.main()
