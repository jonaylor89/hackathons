from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase, RequestFactory

from .views import index


class APITest(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

    def test_details(self):
        # Create an instance of a GET request.
        request = self.factory.get('/')
        request.user = AnonymousUser()

        # Test my_view() as if it were deployed at /customer/details
        response = index(request)
        self.assertEqual(response.status_code, 200)

    def test_clean(self):
        # Create an instance of a POST request
        request = self.factory.post('/', json={"body", "www.facebook.com"})
        request.user = AnonymousUser()

        response = index(request)
        self.assertEqual(response.content.decode(), "[]")

    def test_user_error(self):
        request = self.factory.post('/', json={"body", "skfbkwhsbfkers"})  # Random Value
        request.user = AnonymousUser()

        response = index(request)
        self.assertEqual(response.content.decode(), "[]")

    def test_get(self):
        request = self.factory.get('/')
        request.user = AnonymousUser()

        response = index(request)
        self.assertEqual(response.content.decode(), "[]")

