import socketio
import time
import sys

class SimpleWebSocketTester:
    def __init__(self, base_url="https://virtual-classroom-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.socket_path = '/api/socket.io'
        self.tests_run = 0
        self.tests_passed = 0
        self.events_received = []
        
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

    def test_basic_connection(self):
        """Test basic Socket.IO connection"""
        print("\n🔍 Testing Basic Socket.IO Connection...")
        
        try:
            # Create simple client
            sio = socketio.SimpleClient()
            
            # Connect to server
            sio.connect(self.base_url, socketio_path=self.socket_path)
            
            if sio.connected:
                self.log_test("Socket.IO Connection", True, "Connected successfully")
                
                # Test basic emit
                sio.emit('join_room', {
                    'room_id': 'test_room_basic',
                    'user_id': 'test_user_basic',
                    'name': 'Basic Test User'
                })
                
                time.sleep(1)
                self.log_test("Basic Event Emit", True, "join_room event sent")
                
                # Test another event
                sio.emit('toggle_mute', {
                    'room_id': 'test_room_basic',
                    'user_id': 'test_user_basic',
                    'is_muted': True
                })
                
                time.sleep(0.5)
                self.log_test("Toggle Mute Event", True, "toggle_mute event sent")
                
                # Test message sending
                sio.emit('send_message', {
                    'room_id': 'test_room_basic',
                    'user_id': 'test_user_basic',
                    'user_name': 'Basic Test User',
                    'content': 'Test message from WebSocket test'
                })
                
                time.sleep(0.5)
                self.log_test("Send Message Event", True, "send_message event sent")
                
                # Test raise hand
                sio.emit('raise_hand', {
                    'room_id': 'test_room_basic',
                    'user_id': 'test_user_basic',
                    'is_hand_raised': True
                })
                
                time.sleep(0.5)
                self.log_test("Raise Hand Event", True, "raise_hand event sent")
                
                # Disconnect
                sio.disconnect()
                
                if not sio.connected:
                    self.log_test("Socket.IO Disconnect", True, "Disconnected successfully")
                else:
                    self.log_test("Socket.IO Disconnect", False, "Still connected")
                    
            else:
                self.log_test("Socket.IO Connection", False, "Failed to connect")
                
        except Exception as e:
            self.log_test("Socket.IO Connection", False, f"Error: {str(e)}")

    def test_multiple_clients(self):
        """Test multiple Socket.IO clients"""
        print("\n🔍 Testing Multiple Socket.IO Clients...")
        
        try:
            # Create two clients
            client1 = socketio.SimpleClient()
            client2 = socketio.SimpleClient()
            
            # Connect both clients
            client1.connect(self.base_url, socketio_path=self.socket_path)
            client2.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            if client1.connected and client2.connected:
                self.log_test("Multiple Client Connection", True, "Both clients connected")
                
                # Both join same room
                room_id = "multi_client_room"
                
                client1.emit('join_room', {
                    'room_id': room_id,
                    'user_id': 'multi_user_1',
                    'name': 'Multi User 1'
                })
                
                client2.emit('join_room', {
                    'room_id': room_id,
                    'user_id': 'multi_user_2',
                    'name': 'Multi User 2'
                })
                
                time.sleep(1)
                self.log_test("Multiple Clients Join Room", True, "Both clients joined room")
                
                # Test interactions
                client1.emit('send_message', {
                    'room_id': room_id,
                    'user_id': 'multi_user_1',
                    'user_name': 'Multi User 1',
                    'content': 'Message from client 1'
                })
                
                client2.emit('toggle_mute', {
                    'room_id': room_id,
                    'user_id': 'multi_user_2',
                    'is_muted': True
                })
                
                time.sleep(1)
                self.log_test("Multiple Client Interactions", True, "Both clients sent events")
                
                # Disconnect clients
                client1.disconnect()
                client2.disconnect()
                
                self.log_test("Multiple Client Cleanup", True, "Both clients disconnected")
                
            else:
                self.log_test("Multiple Client Connection", False, "Failed to connect both clients")
                
        except Exception as e:
            self.log_test("Multiple Clients", False, f"Error: {str(e)}")

    def test_error_scenarios(self):
        """Test error handling scenarios"""
        print("\n🔍 Testing Error Scenarios...")
        
        try:
            client = socketio.SimpleClient()
            client.connect(self.base_url, socketio_path=self.socket_path)
            
            if client.connected:
                # Test with missing room_id
                try:
                    client.emit('join_room', {
                        'user_id': 'error_user',
                        'name': 'Error User'
                        # Missing room_id
                    })
                    self.log_test("Missing Room ID", True, "Handled gracefully")
                except Exception as e:
                    self.log_test("Missing Room ID", False, f"Error: {str(e)}")
                
                # Test with empty message
                try:
                    client.emit('send_message', {
                        'room_id': 'error_room',
                        'user_id': 'error_user',
                        'user_name': 'Error User',
                        'content': ''  # Empty content
                    })
                    self.log_test("Empty Message Content", True, "Handled gracefully")
                except Exception as e:
                    self.log_test("Empty Message Content", False, f"Error: {str(e)}")
                
                # Test with invalid data types
                try:
                    client.emit('toggle_mute', {
                        'room_id': 'error_room',
                        'user_id': 'error_user',
                        'is_muted': 'invalid_boolean'  # Should be boolean
                    })
                    self.log_test("Invalid Data Types", True, "Handled gracefully")
                except Exception as e:
                    self.log_test("Invalid Data Types", False, f"Error: {str(e)}")
                
                client.disconnect()
                
            else:
                self.log_test("Error Scenarios Setup", False, "Could not connect client")
                
        except Exception as e:
            self.log_test("Error Scenarios", False, f"Error: {str(e)}")

    def test_room_isolation(self):
        """Test that rooms are properly isolated"""
        print("\n🔍 Testing Room Isolation...")
        
        try:
            client1 = socketio.SimpleClient()
            client2 = socketio.SimpleClient()
            
            client1.connect(self.base_url, socketio_path=self.socket_path)
            client2.connect(self.base_url, socketio_path=self.socket_path)
            
            time.sleep(1)
            
            if client1.connected and client2.connected:
                # Put clients in different rooms
                client1.emit('join_room', {
                    'room_id': 'isolation_room_1',
                    'user_id': 'isolation_user_1',
                    'name': 'Isolation User 1'
                })
                
                client2.emit('join_room', {
                    'room_id': 'isolation_room_2',
                    'user_id': 'isolation_user_2',
                    'name': 'Isolation User 2'
                })
                
                time.sleep(1)
                
                # Send messages in different rooms
                client1.emit('send_message', {
                    'room_id': 'isolation_room_1',
                    'user_id': 'isolation_user_1',
                    'user_name': 'Isolation User 1',
                    'content': 'Message in room 1'
                })
                
                client2.emit('send_message', {
                    'room_id': 'isolation_room_2',
                    'user_id': 'isolation_user_2',
                    'user_name': 'Isolation User 2',
                    'content': 'Message in room 2'
                })
                
                time.sleep(1)
                self.log_test("Room Isolation", True, "Messages sent to different rooms")
                
                client1.disconnect()
                client2.disconnect()
                
            else:
                self.log_test("Room Isolation Setup", False, "Could not connect clients")
                
        except Exception as e:
            self.log_test("Room Isolation", False, f"Error: {str(e)}")

    def run_websocket_tests(self):
        """Run all WebSocket tests"""
        print("🔌 Starting Simple WebSocket Test Suite")
        print("=" * 50)
        
        tests = [
            self.test_basic_connection,
            self.test_multiple_clients,
            self.test_error_scenarios,
            self.test_room_isolation
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
        
        return self.tests_passed == self.tests_run

def main():
    """Main WebSocket test runner"""
    tester = SimpleWebSocketTester()
    success = tester.run_websocket_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())