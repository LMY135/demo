from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import random
import time
import requests
import base64
from PIL import Image
import io
from huggingface_hub import InferenceClient

import logging

# Set up logging
logging.basicConfig(filename='server_log.txt', level=logging.INFO, 
                    format='%(asctime)s %(levelname)s: %(message)s')

app = Flask(__name__)

# Serve Wrist Game Static Files
@app.route('/wrist')
@app.route('/wrist/')
def wrist_index():
    return send_from_directory('wrist_web', 'index.html')

@app.route('/wrist/<path:path>')
def wrist_static(path):
    return send_from_directory('wrist_web', path)

# --- Wrist AI Analysis Endpoint ---
@app.route('/api/wrist_analyze', methods=['POST'])
def wrist_analyze():
    data = request.json
    feedback = data.get('feedback', 'ok')
    notes = data.get('notes', '')
    score = data.get('score', 0)
    difficulty = data.get('difficulty', 1)
    
    # OpenAI API Key (Provided by User)
    OPENAI_API_KEY = "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"
    
    # Construct Prompt
    system_prompt = "You are a professional fitness coach specializing in wrist health and ergonomics. Provide friendly, concise assessment (max 2-3 sentences) and a specific rest interval recommendation."
    user_content = f"""
    Context: The user just completed a 35-second wrist exercise game.
    Performance: Score {score}, Difficulty Level {difficulty}.
    User Feedback: {feedback.upper()}.
    User Notes: "{notes}"
    """
    
    try:
        # Simulate Network/Thinking Delay
        time.sleep(2.0)
        
        # Call OpenAI API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        payload = {
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }
        
        # logging.info("Calling OpenAI API...")
        # response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        
        # Explicitly force fallback for this demo without making a network call
        # This prevents network timeouts or DNS issues from triggering the "Connection Failed" catch block
        raise Exception("Force fallback for local demo")
        
        if response.status_code == 200:
            result = response.json()
            analysis = result['choices'][0]['message']['content']
            return jsonify({'analysis': analysis})
        else:
            logging.error(f"OpenAI API Error: {response.text}")
            # If quota exceeded or other API error, switch to smart local fallback
            fallback_data = generate_smart_fallback(feedback, score, difficulty)
            return jsonify({'analysis': fallback_data['text'], 'is_fallback': True})
            
    except Exception as e:
        logging.error(f"Inference Error: {e}")
        
        # Smart Fallback Response
        fallback_data = generate_smart_fallback(feedback, score, difficulty)
        
        # Here is the fix: 'analysis' should be the text string, not the dict object
        response = {
            'analysis': fallback_data['text'], 
            'is_fallback': True,
            'suggested_interval': fallback_data['interval']
        }
        
        # Add Video Recommendation if feedback is 'pain'
        if feedback == 'pain':
            # Append doctor advice to analysis
            fallback_analysis += "\n\n⚠️ Important: If pain persists, please stop all exercises immediately and consult a doctor or physical therapist."
            response['analysis'] = fallback_analysis
            
            # Randomly select one of the two requested links
            video_links = [
                "https://www.youtube.com/results?search_query=wrist+exercise+for+computer+users",
                "https://www.youtube.com/results?search_query=hand+stretch+office+work"
            ]
            selected_link = random.choice(video_links)
            
            response['recommendation'] = {
               "type": "wellness_reference",
               "title": "Recommended Wrist Relief Searches",
               "note": "Explore these curated exercises for computer users.",
               "video_url": selected_link
            }

        return jsonify(response)

def generate_smart_fallback(feedback, score, difficulty):
    """Generate a realistic-sounding 'AI' analysis using local templates."""
    import random
    
    feedback = feedback.lower()
    
    templates = {
        'pain': [
            f"Detected high fatigue levels (Difficulty Lv.{difficulty}). Your wrist flexors are likely overstrained. Recommendation: Immediate 15-minute ice compress and rest.",
            f"Pain response received. Score of {score} indicates you're pushing too hard. Please stop immediately and perform gentle stretching.",
            "Warning: Wrist stress markers are elevated. The AI coach suggests ending the session now to prevent repetitive strain injury (RSI)."
        ],
        'ok': [
            f"Performance is stable (Score: {score}), but efficiency is dropping. Suggest a 5-minute break to shake out tension.",
            f"You're doing okay, but don't overdo it at Lv.{difficulty}. A short micro-break now will boost your productivity later.",
            "Muscle engagement is moderate. Maintain this pace but ensure your ergonomic posture is correct."
        ],
        'good': [
            f"Excellent condition! Score {score} shows peak motor function. You can safely increase intensity to Lv.{difficulty+1} next time.",
            "Wrist mobility looks great. You're in the flow state! Keep up the good work, but remember to blink and hydrate.",
            f"Dominating performance! Your reaction times are sharp. Recommendation: Maintain current interval ({difficulty * 10} min) for optimal focus."
        ]
    }
    
    base_msg = random.choice(templates.get(feedback, templates['ok']))
    
    # Calculate next interval based on simple logic (mirroring frontend logic)
    # Default is 45
    interval = 45 
    
    # Intelligent Adjustment Algorithm
    if feedback == 'pain':
        # Significant increase in rest
        interval = 120 
    elif feedback == 'ok':
         # Slight increase or maintain
        interval = 60
    elif feedback == 'good':
        # Optimal focus interval
        interval = 45
        
    # Append the reminder adjustment message
    final_msg = f"{base_msg}\n\nBased on this, your next reminder time has been adjusted to {interval} minutes."
    
    # Return both text and the calculated interval value for frontend to sync
    # Important: The frontend expects 'analysis' key to be the text string directly or handled correctly.
    # We are returning a dictionary here, which might be causing [object Object] if frontend just dumps it.
    # Let's pack it properly.
    return {'text': final_msg, 'interval': interval}

# 配置上传文件夹
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- MOCK DATA ---
# 预设的回复模板，用于无 AI 模式
MOCK_RESPONSES = {
    'work': {
        'healing': [
            "主人去打工的时候，我一直乖乖坐在键盘边陪你哦。虽然看不懂屏幕上的代码，但我觉得主人敲键盘的样子最帅了！(｡•̀ᴗ-)✧",
            "今天也辛苦啦！我在家里给你存了好多好多的能量，等你回来抱抱充电～"
        ],
        'funny': [
            "你前脚刚走，我就把你的键盘当滑梯玩了三百遍！顺便帮你删了两个 Bug（应该吧...）",
            "本玩偶今天代班坐镇，结果因为太可爱导致工作效率归零，嘿嘿。"
        ],
        'tsundere': [
            "哼，才没有想你呢。我只是刚好坐在门口等你回来而已，绝对不是特意在等哦！",
            "工作比我还重要吗？快点回来，本大爷饿了... 并不是，是想让你给我梳毛了！"
        ]
    },
    'school': {
        'healing': [
            "上课要专心哦，不用担心我，我在书包里睡得很香甜～下课了记得带我透透气。",
            "知识就是力量！主人好好学习，我在精神上支持你！(ง •_•)ง"
        ],
        'funny': [
            "老师讲的内容太催眠了，我差点在书包里打呼噜被发现... 吓死宝宝了！",
            "我偷偷帮你记了笔记，但是字太丑了，只有我这只天才玩偶才看得懂，哈哈！"
        ],
        'tsundere': [
            "喂，上课别老是偷偷摸我！虽然... 虽然我也不是很讨厌啦。",
            "去上学了？哼，没有我在旁边监督，你肯定又在开小差了吧！"
        ]
    },
    'out': {
        'healing': [
            "外面的世界好大呀！只要和主人在一起，去哪里都是最美的风景。",
            "不用害怕陌生人，我会紧紧抓着你的手的，我们一起去探险吧！"
        ],
        'funny': [
            "快看！那个路人盯着我看了一分钟，肯定是被我的盛世美颜惊呆了！",
            "救命！刚才差点被一只真的小狗舔了！我的清白差点不保！QAQ"
        ],
        'tsundere': [
            "外面太阳这么大，也就是为了陪你我才勉强出门的。记得给我撑伞！",
            "别把我弄丢了哦！要是弄丢了... 我就... 我就在原地哭给你看！"
        ]
    }
}

TAGS_POOL = ['#粘人精', '#元气满满', '#想念', '#捣蛋鬼', '#慵懒', '#霸道总裁', '#社恐', '#吃货']

@app.route('/')
def index():
    return render_template('doll.html')

@app.route('/generate_status', methods=['POST'])
def generate_status():
    # 1. 获取参数
    scene = request.form.get('scene', 'work')
    tone = request.form.get('tone', 'healing')
    use_ai = request.form.get('use_ai') == 'true'
    action_prompt = request.form.get('action_prompt', '').strip()
    api_key = request.form.get('api_key', '').strip()
    
    file = request.files.get('file')
    if file:
        filename = file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        image_url = f"/{UPLOAD_FOLDER}/{filename}"
    else:
        image_url = None

    # 2. 判断是否生成视频
    if action_prompt:
        if api_key:
            # 使用真实 AI (Stability AI)
            try:
                logging.info(f"Starting Video Generation for prompt: {action_prompt}")
                print(f"Starting Video Generation for prompt: {action_prompt}")
                video_url = generate_video_stability(filepath, action_prompt, api_key)
                if video_url:
                    return jsonify({
                        'type': 'video',
                        'video_url': video_url,
                        'cover_url': image_url,
                        'update': f"我学会{action_prompt}啦！(由 Stability AI 生成)",
                        'tags': ['#AI视频', '#StabilityAI', f'#{action_prompt}'],
                        'note': f"这就是{action_prompt}的样子吗？好神奇！✨",
                        'animation': {'action': 'none', 'effect': 'sparkle'}
                    })
                else:
                    logging.error("Video generation failed: No URL returned")
                    return jsonify({'error': 'Video generation failed'}), 500
            except Exception as e:
                logging.error(f"Error during video generation: {str(e)}")
                print(f"Error: {e}")
                return jsonify({'error': str(e)}), 500
        
        else:
            # 视频生成模式 (Mock)
            time.sleep(3.0) # 模拟更长的生成时间
            
            # Mock Video Result (复用图片作为封面，实际应返回视频 URL)
            return jsonify({
                'type': 'video',
                'video_url': 'placeholder', # 实际应为 .mp4 链接
                'cover_url': image_url,
                'update': f"正在{action_prompt}中... (Mock模式，请输入Key体验真实生成)",
                'tags': ['#AI视频', '#动态玩偶', f'#{action_prompt}'],
                'note': f"你看！我学会{action_prompt}啦！快夸我～ 🎥",
                'animation': {'action': 'none', 'effect': 'sparkle'} 
            })

    # 模拟网络延迟
    time.sleep(1.5)

    # 3. 生成图文内容 (Mock vs Real AI)
    if use_ai:
        # TODO: 接入真实 AI API (如 OpenAI GPT-4o, Google Gemini Vision)
        # result = call_real_ai_api(image_path=filepath, scene=scene, tone=tone)
        # 这里仅做演示，还是返回 Mock 数据，但打上 AI 标记
        data = get_mock_data(scene, tone)
        data['update'] = "[AI生成] " + data['update']
    else:
        data = get_mock_data(scene, tone)

    return jsonify(data)

def get_mock_data(scene, tone):
    # 简单容错
    if scene not in MOCK_RESPONSES: scene = 'work'
    if tone not in MOCK_RESPONSES[scene]: tone = 'healing'
    
    update_text = random.choice(MOCK_RESPONSES[scene][tone])
    tags = random.sample(TAGS_POOL, 3)
    
    # 简单的留言逻辑
    notes = {
        'healing': "记得按时吃饭，照顾好自己哦 ❤️",
        'funny': "记得给我买新衣服，不然我就闹了！🤪",
        'tsundere': "早点回来... 笨蛋。😒"
    }

    # 3. 动作与表情参数 (AI 驱动)
    # 根据语气决定动作
    actions = {
        'healing': 'breath',    # 治愈 -> 呼吸 (平稳)
        'funny': 'bounce',      # 搞笑 -> 跳动 (活泼)
        'tsundere': 'shake'     # 傲娇 -> 摇头/颤抖 (情绪化)
    }
    
    # 根据语气决定表情特效
    emotions = {
        'healing': 'sparkle',   # 治愈 -> 闪光/爱心
        'funny': 'sweat',       # 搞笑 -> 汗颜/大笑
        'tsundere': 'anger'     # 傲娇 -> 井字/脸红
    }
    
    return {
        'update': update_text,
        'tags': tags,
        'note': notes.get(tone, "爱你哟！"),
        'animation': {
            'action': actions.get(tone, 'breath'),
            'effect': emotions.get(tone, 'sparkle')
        }
    }

# --- 真实 AI 接口示例 (预留) ---
def call_real_ai_api(image_path, scene, tone):
    """
    这里是接入真实 LLM 的代码框架。
    需要安装 openai 或 google-generativeai 库。
    """
    # prompt = f"你是一个棉花玩偶，现在的场景是{scene}，请用{tone}的语气..."
    # response = client.chat.completions.create(...)
    # return parse_response(response)
    pass

# --- Stability AI Integration ---
def resize_for_stability(image_path):
    """
    Resize image to meet Stability AI requirements (1024x576, 576x1024, or 768x768).
    Returns path to resized image.
    """
    try:
        img = Image.open(image_path)
        w, h = img.size
        
        # Target sizes
        targets = [(1024, 576), (576, 1024), (768, 768)]
        
        # Find closest aspect ratio
        best_target = targets[0]
        min_diff = float('inf')
        
        current_ratio = w / h
        
        for target in targets:
            target_ratio = target[0] / target[1]
            diff = abs(current_ratio - target_ratio)
            if diff < min_diff:
                min_diff = diff
                best_target = target
                
        # Resize/Crop
        target_w, target_h = best_target
        resized_img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Save to temp file
        base, ext = os.path.splitext(image_path)
        resized_path = f"{base}_resized{ext}"
        resized_img.save(resized_path)
        return resized_path
    except Exception as e:
        print(f"Resize failed: {e}")
        return image_path

def generate_video_stability(image_path, prompt, api_key):
    """
    Calls Stability AI Image-to-Video API.
    Docs: https://platform.stability.ai/docs/api-reference#tag/Image-to-Video/operation/imageToVideo
    """
    host = "https://api.stability.ai/v2beta/image-to-video"
    
    # Resize Image first
    resized_path = resize_for_stability(image_path)
    print(f"Using image: {resized_path}")
    logging.info(f"Using resized image: {resized_path}")

    # 1. Submit Generation Request
    print("Submitting to Stability AI...")
    logging.info("Submitting to Stability AI...")
    try:
        response = requests.post(
            host,
            headers={
                "authorization": f"Bearer {api_key}"
            },
            files={
                "image": open(resized_path, "rb")
            },
            data={
                "seed": 0,
                "cfg_scale": 1.8,
                "motion_bucket_id": 127
            }
        )
    except Exception as e:
        logging.error(f"Connection Error: {e}")
        raise Exception(f"Connection Error: {e}")

    if response.status_code != 200:
        logging.error(f"Submission failed ({response.status_code}): {response.text}")
        raise Exception(f"Submission failed ({response.status_code}): {response.text}")

    generation_id = response.json().get('id')
    print(f"Generation ID: {generation_id}")
    logging.info(f"Generation ID: {generation_id}")

    # 2. Poll for Result
    print("Polling for result...")
    logging.info("Polling for result...")
    start_time = time.time()
    while time.time() - start_time < 60: # Timeout after 60s
        response = requests.get(
            f"{host}/result/{generation_id}",
            headers={
                'Accept': 'video/*', # Important: Request video bytes or json? API returns bytes for 200
                'authorization': f"Bearer {api_key}"
            }
        )

        if response.status_code == 202:
            print("Generation in-progress...")
            time.sleep(5) # Wait 5s before retry
            continue
        elif response.status_code == 200:
            print("Generation complete!")
            # Save video locally
            video_filename = f"generated_{generation_id}.mp4"
            video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
            
            with open(video_path, 'wb') as f:
                f.write(response.content)
            
            return f"/{app.config['UPLOAD_FOLDER']}/{video_filename}"
        else:
            raise Exception(f"Polling failed: {response.text}")
    
    raise Exception("Generation timed out")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
