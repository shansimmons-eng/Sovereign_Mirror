#!/usr/bin/env python3
"""
Sovereign Mirror - Trusted Kernel Server
Uses Python's built-in http.server - no external dependencies
"""

import json
import math
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 3001
PHI = 0.618
ENTROPY = 0.07

def veracity_gate(active, control):
    return max(0, active - control)

def calculate_quorum(active_nodes):
    sqrt_plus_two = math.ceil(math.sqrt(active_nodes)) + 2
    return min(active_nodes, sqrt_plus_two)

def calculate_atrophy_decay(virtual_resonance, elapsed_ms, t_limit=86400000, decay_rate=0.95):
    if elapsed_ms <= 0:
        return virtual_resonance
    t = math.floor(elapsed_ms / t_limit)
    return virtual_resonance * (decay_rate ** t)

def get_threshold_with_entropy():
    return PHI * (1 + ENTROPY)

class KernelHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[KERNEL] {args[0]}")
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/api/health':
            self.send_json({'status': 'TRUSTED_KERNEL_ONLINE', 'timestamp': self.timestamp()})
        elif self.path == '/api/kernel/version':
            self.send_json({
                'version': '1.0.0',
                'build': 'TRUSTED_KERNEL',
                'commit': 'SOVEREIGN_MIRROR_PHASE_7',
                'timestamp': self.timestamp()
            })
        else:
            self.send_json({'error': 'Not found'}, 404)
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode()
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json({'error': 'Invalid JSON'}, 400)
            return
        
        if self.path == '/api/pgate/engage':
            mode = data.get('mode')
            level = data.get('level')
            
            if not mode or not isinstance(level, (int, float)):
                self.send_json({'error': 'mode and level are required'}, 400)
                return
            
            threshold = get_threshold_with_entropy()
            can_engage = level >= threshold
            
            engagement = {
                'mode': mode,
                'level': level,
                'threshold': threshold,
                'canEngage': can_engage,
                'status': 'ENGAGED' if can_engage else 'BLOCKED',
                'message': f"P-Gate {'engaged' if can_engage else 'blocked'} at resonance level {level:.3f}",
                'timestamp': self.timestamp()
            }
            
            print(f"[PGATE] {engagement['status']} - {engagement['message']}")
            self.send_json(engagement)
            
        elif self.path == '/api/veracity/calculate':
            active = data.get('active')
            control = data.get('control')
            
            if not isinstance(active, (int, float)) or not isinstance(control, (int, float)):
                self.send_json({'error': 'active and control must be numbers'}, 400)
                return
            
            result = veracity_gate(active, control)
            self.send_json({'veracity': result, 'timestamp': self.timestamp()})
            
        elif self.path == '/api/quorum/calculate':
            active_nodes = data.get('activeNodes')
            affirming_nodes = data.get('affirmingNodes')
            
            if not isinstance(active_nodes, int):
                self.send_json({'error': 'activeNodes must be a number'}, 400)
                return
            
            quorum = calculate_quorum(active_nodes)
            reached = None
            if affirming_nodes is not None:
                reached = affirming_nodes >= quorum
            
            self.send_json({'quorum': quorum, 'reached': reached, 'timestamp': self.timestamp()})
            
        elif self.path == '/api/atrophy/calculate':
            virtual_resonance = data.get('virtualResonance')
            elapsed_ms = data.get('elapsedMs')
            
            if not isinstance(virtual_resonance, (int, float)) or not isinstance(elapsed_ms, (int, float)):
                self.send_json({'error': 'virtualResonance and elapsedMs must be numbers'}, 400)
                return
            
            result = calculate_atrophy_decay(virtual_resonance, elapsed_ms)
            self.send_json({'atrophied': result, 'timestamp': self.timestamp()})
            
        else:
            self.send_json({'error': 'Not found'}, 404)
    
    def timestamp(self):
        import time
        return int(time.time() * 1000)

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), KernelHandler)
    print(f"[TRUSTED_KERNEL] Server running on port {PORT}")
    print(f"[TRUSTED_KERNEL] Using Python built-in http.server (no dependencies)")
    print(f"  GET  /api/health")
    print(f"  POST /api/pgate/engage")
    print(f"  POST /api/veracity/calculate")
    print(f"  POST /api/quorum/calculate")
    print(f"  POST /api/atrophy/calculate")
    print(f"  GET  /api/kernel/version")
    print()
    print("Test curl:")
    print('curl -X POST http://localhost:3001/api/pgate/engage -H "Content-Type: application/json" -d "{\"mode\": \"resonance\", \"level\": 0.75}"')
    
    server.serve_forever()