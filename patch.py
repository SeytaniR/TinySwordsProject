# -*- coding: utf-8 -*-
import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

new_ui = '''        <!-- Nova HUD no topo direito -->
        <div id="hud-top-right" style="display: none; position: fixed; top: 15px; right: 20px; background: rgba(0,0,0,0.6); padding: 10px 20px; border-radius: 10px; border: 2px solid #555; pointer-events: none; z-index: 1000; font-size: 20px; font-weight: bold; text-shadow: 1px 1px 2px black;">
            <div style="display:flex; align-items:center; margin-bottom: 5px;">
                <span style="color:#ff4444; width: 30px;">??</span> 
                <span id="ui-hp">100%</span>
            </div>
            <div style="display:flex; align-items:center; margin-bottom: 5px;">
                <span style="color:#ffd700; width: 30px;">??</span> 
                <span id="ui-gold">0</span>
            </div>
            <div style="display:flex; align-items:center;">
                <span style="color:#8b4513; width: 30px;">??</span> 
                <span id="ui-wood">0</span>
            </div>
        </div>

        <!-- Botão de Inventário e Menu de Construção -->
        <div id="build-btn-container" style="display: none; position: fixed; bottom: 30px; right: 30px; z-index: 1000;">
            <div id="build-menu" style="display: none; background: rgba(0,0,0,0.85); padding: 15px; border-radius: 10px; border: 2px solid #888; margin-bottom: 15px;">
                <h3 style="margin-top:0; color: #fff; text-align: center; font-size: 16px;">Inventario / Construir</h3>
                <button onclick="window.placeBlueprint('tower')" style="width: 100%; margin-bottom: 10px; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 5px; cursor: pointer; text-align: left; font-size: 16px;">
                    ?? Torre <span style="color:#aaa; font-size:14px; float:right;">20?? 10??</span>
                </button>
                <button onclick="window.placeBlueprint('castle')" style="width: 100%; padding: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 5px; cursor: pointer; text-align: left; font-size: 16px;">
                    ?? Castelo <span style="color:#aaa; font-size:14px; float:right;">50?? 50??</span>
                </button>
            </div>
            <button id="toggle-build-btn" onclick="document.getElementById('build-menu').style.display = document.getElementById('build-menu').style.display == 'none' ? 'block' : 'none'" style="width: 70px; height: 70px; border-radius: 50%; background: #4caf50; border: 3px solid #2e7d32; color: white; font-size: 32px; display: flex; justify-content: center; align-items: center; cursor: pointer; float: right; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                ??
            </button>
        </div>
        <div id="mobile-controls">
            <div class="joy-container" id="joystick-zone">
                <div class="joy-knob" id="joystick-knob"></div>
            </div>
        </div>'''

content = re.sub(r'<div id="ui".*?<div class="action-buttons">.*?</div>\s*</div>\s*</div>', new_ui + '\n    </div>', content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
