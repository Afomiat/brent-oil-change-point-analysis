import os
import sys
import unittest

# Add project root to sys.path to allow importing from src
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from src.backend.app import app, load_prices_df, load_events_df

class TestBackend(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_data_paths(self):
        """Test that Brent Crude Prices and Events datasets exist."""
        from src.backend.app import PRICES_PATH, EVENTS_PATH
        self.assertTrue(os.path.exists(PRICES_PATH), f"Prices file missing: {PRICES_PATH}")
        self.assertTrue(os.path.exists(EVENTS_PATH), f"Events file missing: {EVENTS_PATH}")

    def test_data_loading(self):
        """Test loading and structures of dataframes."""
        prices_df = load_prices_df()
        self.assertIsNotNone(prices_df)
        self.assertIn('Price', prices_df.columns)
        self.assertGreater(len(prices_df), 0)

        events_df = load_events_df()
        self.assertIsNotNone(events_df)
        self.assertIn('Event', events_df.columns)
        self.assertIn('Category', events_df.columns)
        self.assertGreater(len(events_df), 0)

    def test_api_prices(self):
        """Test /api/prices returns valid JSON list of prices."""
        response = self.client.get('/api/prices?downsample=monthly')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn('date', data[0])
        self.assertIn('price', data[0])

    def test_api_events(self):
        """Test /api/events returns structured event list with calculated impacts."""
        response = self.client.get('/api/events')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn('event', data[0])
        self.assertIn('price_change', data[0])
        self.assertIn('price_change_pct', data[0])

    def test_api_changepoints(self):
        """Test /api/changepoints returns change point model constants."""
        response = self.client.get('/api/changepoints')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data['change_point_date'], '2005-03-31')
        self.assertIn('mu_1', data)
        self.assertIn('mu_2', data)

    def test_api_metrics(self):
        """Test /api/metrics returns correct time series statistics."""
        response = self.client.get('/api/metrics')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertIn('average_price', data)
        self.assertIn('latest_volatility_annualized', data)

if __name__ == '__main__':
    unittest.main()
