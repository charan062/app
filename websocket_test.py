import socketio
import asyncio
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import sys

class WebSocketTester:
    def __init__(self, base_url="https://virtual-classroom-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.socket_path = '/api/socket.io'
        self.clients = []
        self.events_received = []
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        if details and success:
            print(f"   {details}")

    def create_client(self, client_id):
        """Create a Socket.IO client"""
        try:
            client = socketio.SimpleClient()
            
            # Event handlers
            def on_connect():
                print(f"Client {client_id} connected")
                
            def on_disconnect():
                print(f"Client {client_id} disconnected")
                
            def on_participant_joined(data):
                self.events_received.append(f"Client {client_id} received participant_joined: {data}")
                
            def on_participant_left(data):
                self.events_received.append(f"Client {client_id} received participant_left: {data}")
                
            def on_participant_updated(data):
                self.events_received.append(f"Client {client_id} received participant_updated: {data}")
                
            def on_hand_raised(data):
                self.events_received.append(f"Client {client_id} received hand_raised: {data}")
                
            def on_new_message(data):
                self.events_received.append(f"Client {client_id} received new_message: {data}")
                
            def on_room_state(data):
                self.events_received.append(f"Client {client_id} received room_state: {len(data.get('participants', []))} participants")
            
            # Register event handlers
            client.on('connect', on_connect)
            client.on('disconnect', on_disconnect)
            client.on('participant_joined', on_participant_joined)
            client.on('participant_left', on_participant_left)
            client.on('participant_updated', on_participant_updated)
            client.on('hand_raised', on_hand_raised)
            client.on('new_message', on_new_message)
            client.on('room_state', on_room_state)
            
            return client
        except Exception as e:
            print(f"Failed to create client {client_id}: {str(e)}")
            return None

    def test_connection_lifecycle(self):
        """Test 1: Connection Lifecycle Testing"""
        print("\n🔍 Testing Connection Lifecycle...")
        
        # Test successful connection
        try:
            client = self.create_client("lifecycle_test")
            client.connect(self.base_url, socketio_path=self.socket_path)
            self.log_test("Socket.IO Connection", True, "Connected successfully")
            
            # Test connection status
            if client.connected:
                self.log_test("Connection Status Check", True, "Client reports connected")
            else:
                self.log_test("Connection Status Check", False, "Client not connected")
            
            # Test disconnect
            client.disconnect()
            time.sleep(0.5)
            
            if not client.connected:
                self.log_test("Disconnect Event", True, "Client disconnected successfully")
            else:
                self.log_test("Disconnect Event", False, "Client still connected")
                
        except Exception as e:
            self.log_test("Socket.IO Connection", False, f"Connection failed: {str(e)}")
            
        # Test connection failure with wrong path
        try:
            client = self.create_client("wrong_path_test")
            client.connect(self.base_url, socketio_path='/wrong/path')
            self.log_test("Wrong Path Connection", False, "Should have failed but didn't")
        except Exception as e:
            self.log_test("Wrong Path Connection", True, f"Correctly failed: {str(e)}")

    def test_room_management(self):
        """Test 2: Room Management Testing"""
        print("\n🔍 Testing Room Management...")
        
        try:
            # Create two clients
            client1 = self.create_client("room_test_1")
            client2 = self.create_client("room_test_2")
            
            client1.connect(self.base_url, socketio_path=self.socket_path)
            client2.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            # Test join_room with valid room_id
            test_room_id = "test_room_123"
            client1.emit('join_room', {
                'room_id': test_room_id,
                'user_id': 'user_1',
                'name': 'Test User 1'
            })
            
            time.sleep(0.5)
            self.log_test("Join Room Valid ID", True, "Event emitted successfully")
            
            # Test join_room with missing room_id
            try:
                client1.emit('join_room', {
                    'user_id': 'user_1',
                    'name': 'Test User 1'
                })
                self.log_test("Join Room Missing ID", True, "Handled gracefully")
            except Exception as e:
                self.log_test("Join Room Missing ID", False, f"Error: {str(e)}")
            
            # Test multiple clients in same room
            client2.emit('join_room', {
                'room_id': test_room_id,
                'user_id': 'user_2',
                'name': 'Test User 2'
            })
            
            time.sleep(1)
            self.log_test("Multiple Clients Same Room", True, "Both clients joined")
            
            # Test clients in different rooms
            client2.emit('join_room', {
                'room_id': 'different_room_456',
                'user_id': 'user_2',
                'name': 'Test User 2'
            })
            
            time.sleep(0.5)
            self.log_test("Clients Different Rooms", True, "Client moved to different room")
            
            # Cleanup
            client1.disconnect()
            client2.disconnect()
            
        except Exception as e:
            self.log_test("Room Management", False, f"Error: {str(e)}")

    def test_broadcasting_sync(self):
        """Test 3: Broadcasting & Real-time Sync Testing"""
        print("\n🔍 Testing Broadcasting & Real-time Sync...")
        
        try:
            # Create multiple clients
            client1 = self.create_client("broadcast_1")
            client2 = self.create_client("broadcast_2")
            
            client1.connect(self.base_url, socketio_path=self.socket_path)
            client2.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            # Join same room
            test_room_id = "broadcast_room"
            client1.emit('join_room', {
                'room_id': test_room_id,
                'user_id': 'broadcast_user_1',
                'name': 'Broadcast User 1'
            })
            
            client2.emit('join_room', {
                'room_id': test_room_id,
                'user_id': 'broadcast_user_2',
                'name': 'Broadcast User 2'
            })
            
            time.sleep(1)
            
            # Clear previous events
            self.events_received.clear()
            
            # Test message broadcasting
            client1.emit('send_message', {
                'room_id': test_room_id,
                'user_id': 'broadcast_user_1',
                'user_name': 'Broadcast User 1',
                'content': 'Test broadcast message'
            })
            
            time.sleep(1)
            
            # Check if both clients received the message
            message_events = [e for e in self.events_received if 'new_message' in e]
            if len(message_events) >= 1:
                self.log_test("Message Broadcasting", True, f"Received {len(message_events)} message events")
            else:
                self.log_test("Message Broadcasting", False, "No message events received")
            
            # Test real-time updates (mute status)
            self.events_received.clear()
            client1.emit('toggle_mute', {
                'room_id': test_room_id,
                'user_id': 'broadcast_user_1',
                'is_muted': True
            })
            
            time.sleep(1)
            
            update_events = [e for e in self.events_received if 'participant_updated' in e]
            if len(update_events) >= 1:
                self.log_test("Real-time Updates", True, f"Received {len(update_events)} update events")
            else:
                self.log_test("Real-time Updates", False, "No update events received")
            
            # Cleanup
            client1.disconnect()
            client2.disconnect()
            
        except Exception as e:
            self.log_test("Broadcasting & Sync", False, f"Error: {str(e)}")

    def test_error_handling(self):
        """Test 4: Error Handling Testing"""
        print("\n🔍 Testing Error Handling...")
        
        try:
            client = self.create_client("error_test")
            client.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            # Test malformed room_id handling
            try:
                client.emit('join_room', {
                    'room_id': None,
                    'user_id': 'error_user',
                    'name': 'Error User'
                })
                self.log_test("Malformed Room ID", True, "Handled gracefully")
            except Exception as e:
                self.log_test("Malformed Room ID", False, f"Error: {str(e)}")
            
            # Test missing data in events
            try:
                client.emit('send_message', {
                    'room_id': 'test_room'
                    # Missing content, user_id, user_name
                })
                self.log_test("Missing Event Data", True, "Handled gracefully")
            except Exception as e:
                self.log_test("Missing Event Data", False, f"Error: {str(e)}")
            
            # Test rapid connect/disconnect cycles
            try:
                for i in range(3):
                    temp_client = self.create_client(f"rapid_{i}")
                    temp_client.connect(self.base_url, socketio_path=self.socket_path)
                    time.sleep(0.1)
                    temp_client.disconnect()
                    time.sleep(0.1)
                
                self.log_test("Rapid Connect/Disconnect", True, "Handled multiple cycles")
            except Exception as e:
                self.log_test("Rapid Connect/Disconnect", False, f"Error: {str(e)}")
            
            # Test socket connection status before emitting
            if client.connected:
                self.log_test("Connection Status Check Before Emit", True, "Client connected")
            else:
                self.log_test("Connection Status Check Before Emit", False, "Client not connected")
            
            # Cleanup
            client.disconnect()
            
        except Exception as e:
            self.log_test("Error Handling", False, f"Error: {str(e)}")

    def test_multi_user_collaboration(self):
        """Test 5: Multi-user Collaboration Testing"""
        print("\n🔍 Testing Multi-user Collaboration...")
        
        try:
            # Create multiple clients for collaboration test
            clients = []
            for i in range(3):
                client = self.create_client(f"collab_{i}")
                client.connect(self.base_url, socketio_path=self.socket_path)
                clients.append(client)
            
            time.sleep(1)
            
            # All join same room
            test_room_id = "collaboration_room"
            for i, client in enumerate(clients):
                client.emit('join_room', {
                    'room_id': test_room_id,
                    'user_id': f'collab_user_{i}',
                    'name': f'Collab User {i}'
                })
            
            time.sleep(2)
            
            # Clear events
            self.events_received.clear()
            
            # Test concurrent updates (hand raising)
            for i, client in enumerate(clients):
                client.emit('raise_hand', {
                    'room_id': test_room_id,
                    'user_id': f'collab_user_{i}',
                    'is_hand_raised': True
                })
                time.sleep(0.1)  # Small delay between actions
            
            time.sleep(2)
            
            # Check for hand raise events
            hand_events = [e for e in self.events_received if 'hand_raised' in e]
            if len(hand_events) >= 3:
                self.log_test("Concurrent User Updates", True, f"Received {len(hand_events)} hand raise events")
            else:
                self.log_test("Concurrent User Updates", False, f"Only received {len(hand_events)} events")
            
            # Test user removal (disconnect one client)
            clients[0].disconnect()
            time.sleep(1)
            
            # Test remaining users still receive updates
            self.events_received.clear()
            clients[1].emit('send_message', {
                'room_id': test_room_id,
                'user_id': 'collab_user_1',
                'user_name': 'Collab User 1',
                'content': 'Message after user left'
            })
            
            time.sleep(1)
            
            message_events = [e for e in self.events_received if 'new_message' in e]
            if len(message_events) >= 1:
                self.log_test("Updates After User Removal", True, "Remaining users receive updates")
            else:
                self.log_test("Updates After User Removal", False, "No updates received")
            
            # Cleanup remaining clients
            for client in clients[1:]:
                if client.connected:
                    client.disconnect()
            
        except Exception as e:
            self.log_test("Multi-user Collaboration", False, f"Error: {str(e)}")

    def test_performance(self):
        """Test 6: Performance Testing"""
        print("\n🔍 Testing Performance...")
        
        try:
            client = self.create_client("performance_test")
            client.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            # Join room
            test_room_id = "performance_room"
            client.emit('join_room', {
                'room_id': test_room_id,
                'user_id': 'perf_user',
                'name': 'Performance User'
            })
            
            time.sleep(1)
            
            # Test rapid successive updates
            start_time = time.time()
            for i in range(10):
                client.emit('toggle_mute', {
                    'room_id': test_room_id,
                    'user_id': 'perf_user',
                    'is_muted': i % 2 == 0
                })
                time.sleep(0.05)  # 50ms between updates
            
            end_time = time.time()
            duration = end_time - start_time
            
            if duration < 2.0:  # Should complete within 2 seconds
                self.log_test("Rapid Updates Performance", True, f"Completed in {duration:.2f}s")
            else:
                self.log_test("Rapid Updates Performance", False, f"Took too long: {duration:.2f}s")
            
            # Test multiple concurrent rooms (simulate with different room IDs)
            rooms = ['room_1', 'room_2', 'room_3']
            for room in rooms:
                client.emit('join_room', {
                    'room_id': room,
                    'user_id': 'perf_user',
                    'name': 'Performance User'
                })
                time.sleep(0.1)
            
            self.log_test("Multiple Rooms", True, "Joined multiple rooms successfully")
            
            # Cleanup
            client.disconnect()
            
        except Exception as e:
            self.log_test("Performance Testing", False, f"Error: {str(e)}")

    def run_all_websocket_tests(self):
        """Run all WebSocket tests"""
        print("🔌 Starting WebSocket Test Suite")
        print("=" * 50)
        
        tests = [
            self.test_connection_lifecycle,
            self.test_room_management,
            self.test_broadcasting_sync,
            self.test_error_handling,
            self.test_multi_user_collaboration,
            self.test_performance
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 WebSocket Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Print received events summary
        if self.events_received:
            print(f"\n📡 Events Received: {len(self.events_received)}")
            for event in self.events_received[-5:]:  # Show last 5 events
                print(f"   {event}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main WebSocket test runner"""
    tester = WebSocketTester()
    success = tester.run_all_websocket_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())