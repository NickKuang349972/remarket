import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** 一則聊天訊息（對應 MySQL 的 messages 表） */
export interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  /** 圖片路徑（uploads/xxx.jpg），沒有圖片時為空字串 */
  image?: string;
  created_at: string;
}

/** 對話摘要：每件商品的最後一則訊息（含商品資料） */
export interface Conversation {
  product_id: number;
  id: number;
  sender: string;
  content: string;
  created_at: string;
  title: string;
  price: number;
  seller: string;
  image?: string;
}

/**
 * 聊天室：用 SSE（Server-Sent Events）接收即時訊息，
 * 送訊息則用一般的 POST。
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;
  private source?: EventSource;

  /**
   * 連上某件商品的聊天室。
   * 連線建立時後端會先推送歷史訊息，之後有新訊息也會即時送來。
   * 回傳一個函式，呼叫它就會斷線。
   */
  connect(productId: number, onMessage: (message: ChatMessage) => void): () => void {
    this.disconnect();

    const source = new EventSource(`${this.baseUrl}/chat_stream.php?product_id=${productId}`);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        onMessage(JSON.parse(event.data) as ChatMessage);
      } catch {
        // 忽略格式錯誤的訊息，不要讓整個聊天室掛掉
      }
    };

    this.source = source;

    return () => this.disconnect();
  }

  disconnect() {
    this.source?.close();
    this.source = undefined;
  }

  /** 把資料庫的相對路徑轉成完整圖片網址 */
  imageUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
  }

  /** 取得「我」的所有對話摘要；身份由後端依 token 判定 */
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; data?: Conversation[]; message?: string }>(
          `${this.baseUrl}/chat_conversations.php`,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success') {
        throw new Error(response.message ?? '無法取得對話');
      }

      return response.data ?? [];
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return [];
      }

      throw error;
    }
  }

  /** 送出訊息；可附一張圖片。發送者由後端依 token 判定，前端不能假冒 */
  async send(productId: number, content: string, image?: File | null): Promise<void> {
    const form = new FormData();
    form.append('product_id', String(productId));
    form.append('content', content);

    if (image) {
      form.append('image', image);
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ status: string; message?: string }>(
          `${this.baseUrl}/send_message.php`,
          form,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success') {
        throw new Error(response.message ?? '發送失敗');
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(error.status === 401 ? '登入已過期，請重新登入' : '發送失敗，請稍後再試');
      }

      throw error;
    }
  }
}
