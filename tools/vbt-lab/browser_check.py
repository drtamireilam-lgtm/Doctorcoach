"""Optional Chromium integration checks, synthetic inputs only.
Install playwright separately; this is not an iPhone/Safari or speaker test.
"""
import importlib.util,json,subprocess,tempfile,threading
from pathlib import Path
import cv2,numpy as np
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('lab_server',Path(__file__).with_name('server.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def main():
    server=module.LabServer(('127.0.0.1',0));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix='dc-vbt-browser-') as tmp, sync_playwright() as p:
            root=Path(tmp);rng=np.random.default_rng(4);bg=rng.integers(10,60,(160,240,3),np.uint8);patch=rng.integers(80,230,(24,24,3),np.uint8)
            avi=root/'synthetic.avi';writer=cv2.VideoWriter(str(avi),cv2.VideoWriter_fourcc(*'MJPG'),30,(240,160))
            for i in range(25):
                frame=bg.copy();frame[100-i*2:124-i*2,100:124]=patch;writer.write(frame)
            writer.release();mp4=root/'synthetic.webm'
            subprocess.run(['ffmpeg','-v','error','-i',str(avi),'-c:v','libvpx-vp9','-lossless','1','-pix_fmt','yuv420p',str(mp4)],check=True)
            browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1280,'height':900},has_touch=True)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.add_init_script("window.testSpoken=[];speechSynthesis.speak=u=>window.testSpoken.push(u.text);")
            page.goto(server.origin);page.locator('#source').set_input_files(str(mp4));expect(page.locator('video')).to_have_js_property('videoWidth',240)
            for key,value in [('x','100'),('y','100'),('w','24'),('h','24')]:page.locator('#'+key).fill(value)
            page.locator('#consent').check();page.locator('#track').click();expect(page.locator('#track-status')).to_contain_text('CANDIDATE_ONLY',timeout=20000)
            page.locator('#analyze').click();expect(page.locator('#results')).to_contain_text('מהירות מוסתרת')
            page.locator('#reviewed').check();page.locator('#metres').fill('.45');page.locator('#pixels').fill('150');page.locator('#plane').check();page.locator('#analyze').click()
            expect(page.locator('#results')).to_contain_text('0.180 m/s')
            with page.expect_download() as event:page.locator('#download').click()
            event.value.save_as(root/'report.json');report=json.loads((root/'report.json').read_text());assert not report['validated'];assert report['provenance']['source_sha256']
            page.locator('#checklist').click();expect(page.locator('#judgment')).to_contain_text('ללא שיפוט')
            page.locator('#mode').select_option('competition_practice');page.locator('#commands button').first.click();assert page.evaluate('testSpoken.length')==0
            page.locator('#voice').check();page.locator('#commands button').first.click();assert page.evaluate('testSpoken')==['Start']
            page.locator('#checklist').click();page.locator('#judge-reviewed').check();page.locator('#judge').click();expect(page.locator('#judgment')).to_contain_text('INDETERMINATE')
            observations=[{'athlete':'synthetic','lift':'bench','protocol':'paused|80kg','session':str(s),'velocity_mps':.2+.1*r,'rir':r,'maximal_intent':True,'reviewed_measurement':True} for s in range(3) for r in range(4)]
            file=root/'calibration.json';file.write_text(json.dumps(observations));page.locator('#athlete').fill('synthetic');page.locator('#protocol').fill('paused|80kg');page.locator('#effort-source').set_input_files(str(file));page.locator('#effort-fit').click();expect(page.locator('#effort-results')).to_contain_text('PERSONAL_RESEARCH_MODEL')
            # Real pointer selection, interruption, correction and independent segment export.
            changed=root/'changed.avi';writer=cv2.VideoWriter(str(changed),cv2.VideoWriter_fourcc(*'MJPG'),30,(240,160))
            patch2=rng.integers(80,230,(24,24,3),np.uint8)
            for i in range(25):
                frame=bg.copy();frame[100-i*2:124-i*2,100:124]=patch if i<8 else patch2;writer.write(frame)
            writer.release();changed_video=root/'changed.webm'
            subprocess.run(['ffmpeg','-v','error','-i',str(changed),'-c:v','libvpx-vp9','-lossless','1','-pix_fmt','yuv420p',str(changed_video)],check=True)
            page.locator('#source').set_input_files(str(changed_video));expect(page.locator('video')).to_have_js_property('videoWidth',240)
            page.locator('#point-size').fill('24')
            def point(x,y):
                page.locator('#overlay').scroll_into_view_if_needed();rect=page.locator('#overlay').bounding_box();page.mouse.click(rect['x']+rect['width']*x/240,rect['y']+rect['height']*y/160)
            point(112,112);expect(page.locator('#x')).to_have_value('100');expect(page.locator('#y')).to_have_value('100')
            rect=page.locator('#overlay').bounding_box()
            page.mouse.move(rect['x']+rect['width']*112/240,rect['y']+rect['height']*112/160);page.mouse.down()
            page.mouse.move(rect['x']+rect['width']*114/240,rect['y']+rect['height']*112/160,steps=4);page.mouse.up()
            expect(page.locator('#x')).to_have_value('102');point(112,112)
            page.locator('#track').click();expect(page.locator('#track-status')).to_contain_text('OCCLUDED_OR_CHANGED',timeout=20000)
            page.locator('#play-track').click();expect(page.locator('#track-status')).to_contain_text('המעקב נעצר',timeout=10000)
            expect(page.locator('video')).to_have_js_property('paused',True)
            page.locator('#correct').click();expect(page.locator('video')).to_have_js_property('currentTime',.267)
            point(112,96);expect(page.locator('#reviewed')).not_to_be_checked()
            page.locator('#track').click();expect(page.locator('#track-status')).to_contain_text('CANDIDATE_ONLY',timeout=20000)
            with page.expect_download() as event:page.locator('#download-labels').click()
            event.value.save_as(root/'markings.json');marks=json.loads((root/'markings.json').read_text())
            assert len(marks['segments'])==2 and marks['segments'][1]['start_frame']==8
            assert marks['segments'][1]['samples'][0]['t']>=8/30-.001
            assert not marks['validated']
            page.locator('#zoom').select_option('2');assert page.locator('.stage').bounding_box()['width']>page.locator('.stage-scroll').bounding_box()['width']*1.8
            page.locator('#zoom').select_option('1')
            # Selecting another source must remove the old measurement and its attestation.
            other=root/'another-source.webm';other.write_bytes(mp4.read_bytes());page.locator('#source').set_input_files(str(other));expect(page.locator('#reviewed')).not_to_be_checked();expect(page.locator('#analyze')).to_be_disabled()
            page.set_viewport_size({'width':390,'height':844})
            expect(page.locator('video')).to_have_js_property('videoWidth',240)
            page.locator('#overlay').scroll_into_view_if_needed();rect=page.locator('#overlay').bounding_box()
            page.touchscreen.tap(rect['x']+rect['width']*112/240,rect['y']+rect['height']*112/160)
            expect(page.locator('#x')).to_have_value('100')
            page.locator('#overlay').focus();page.keyboard.press('ArrowRight');expect(page.locator('#x')).to_have_value('101')
            for width in [390,1280]:
                page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert not errors,errors
            browser.close();print('Chromium lab workflow passed: tracking, gates, marker click/drag/touch, loss pause, correction/restart, segment export, zoom, keyboard, checklist, voice dispatch, calibration, source reset and responsive layouts (synthetic; no Safari or live speaker validation)')
    finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':main()
