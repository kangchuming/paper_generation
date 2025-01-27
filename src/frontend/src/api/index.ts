import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useOutlineStore } from '@store/outline';

const API_BASE_URL = 'http://localhost:3000';

// 调用大纲生成接口
export async function fetchOutline(message: string) {
    try {
        const updateInputVal = useOutlineStore.getState().updateInputVal;
        let isFirstMessage = true;  // 用于追踪是否是第一条消息

        await fetchEventSource(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),

            onmessage(event) {
                const text = event.data;
                console.log('Received: ', text);

                if(text === '[DONE]') {
                    return;
                }

                // 如果是第一条消息， 清空之前的内容
                if(isFirstMessage) {
                    updateInputVal(() => text);
                    isFirstMessage = false;
                } else {
                    updateInputVal((prevInputVal) => prevInputVal + text);
                }
            },

            onerror(error) {
                console.error('Error occurred:', error);
                // 可以在这里添加错误提示UI
                updateInputVal((prevInputVal) => 
                    prevInputVal + '\n\n[错误：连接中断，请重试]'
                );
                throw error; // 或者根据需要处理错误
            },

            onclose() {
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
                // 处理每个事件消息
                const text = event.data;
                console.log('Received:', text);

                // 更新 store 中的 paper 内容
                updatePaper((prevPaper) => prevPaper + text);
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