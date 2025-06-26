import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useOutlineStore } from '@store/outline';

const API_BASE_URL = '';  // 使用相对路径，让 Vite 的代理来处理

// 调用大纲生成接口
export async function fetchOutline(message: string) {
    try {
        const updateInputVal = useOutlineStore.getState().updateInputVal;
        const updateEndOutlineMarker = useOutlineStore.getState().updateEndOutlineMarker;
        // 在开始新的请求时清空内容
        updateInputVal(() => '');

        await fetchEventSource(`${API_BASE_URL}/api/pre/genoutline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),

            onopen(response) {
                return new Promise<void>((resolve, reject) => {
                    if (response.ok && response.status === 200) {
                        console.log('Connection opened successfully');
                        resolve();
                    } else {
                        reject(new Error(`Failed to open connection: ${response.status} ${response.statusText}`));
                    }
                });
            },

            onmessage(event) {
                if (event.event === 'FatalError') {
                    throw new Error(event.data);
                }
                const data = JSON.parse(event.data);
                try {  
                    if (data.isLastMessage === true) {
                        return;
                    }
                    updateInputVal(data.content);

                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            },

            onerror(error) {
                console.error('Stream error:', error);
                updateInputVal((prevInputVal: string) =>
                    prevInputVal + '\n\n[错误：连接中断，请重试]'
                );
                throw error;
            },

            onclose() {
                updateEndOutlineMarker(true);
                console.log('Connection closed');
            },
        })

    } catch (err) {
        console.log('调用接口出错: ', err);
        throw err;
    }
}

// 调用论文生成接口
export async function fetchPaper(message: string) {
    try {
        // 获取 store 的更新函数
        const updatePaper = useOutlineStore.getState().updatePaper;

        // 使用 fetchEventSource 处理 SSE
        await fetchEventSource(`${API_BASE_URL}/api/chat/paper/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),

            onmessage(event) {
                if (event.event === 'FatalError') {
                    throw new Error(event.data);
                }
                
                const data = JSON.parse(event.data);
                try {  
                    if (data.isLastMessage === true) {
                        return;
                    }
                    // 使用更灵活的正则表达式匹配
                    const content = data.content.replace(/^-\s*\*{0,2}([^*]*)\*{0,2}/, '$1');
                    updatePaper(content);

                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            },

            onopen(response) {
                console.log('Connection opened:', response.status);
                return Promise.resolve();
            },

            onerror(error) {
                console.error('Error occurred:', error);
            },

            onclose() {
                console.log('Connection closed');
            }
        });

    } catch (err) {
        console.error('调用接口出错:', err);
        throw err;
    }
}