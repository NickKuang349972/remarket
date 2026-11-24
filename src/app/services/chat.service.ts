import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  image?: string;
  created_at: string;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected';

export interface Offer {
  id: number;
  buyer: string;
  amount: number;
  status: OfferStatus;
  created_at: string;
}

export interface OfferState {
  status: OfferStatus;
  amount: number;
  created_at?: string;
}

export type ChatStreamEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'offers'; offers: Offer[] };

export interface ConversationDetail {
  id: number;
  product_id: number;
  buyer: string;
  seller: string;
  counterpart: string;
  title: string;
  price: number;
  description?: string;
  status?: string;
  category?: string;
  address?: string;
  image?: string;
}

/** 「我的對話」列表的一列：會話摘要 + 最後一則訊息 */
export interface ConversationSummary {
  conversation_id: number;
  product_id: number;
  buyer: string;
  seller: string;
  counterpart: string;
  title: string;
  price: number;
  image?: string;
  last_message_id?: number | null;
  sender?: string | null;
  content?: string | null;
  created_at?: string | null;
}

export interface ConversationDetailResponse {
  conversation: ConversationDetail;
  messages: ChatMessage[];
  offers: Offer[];
}

/**
 * 聊天室：以「會話」為單位（同一件商品，每個買家各自一條）。
 * 用 SSE 接收即時訊息與議價卡片，送訊息、出價則用一般的 POST。
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;
  private source?: EventSource;

  /** 買家對商品開啟（或取得既有）會話，回傳 conversation id */
  async openConversation(productId: number): Promise<number> {
    const form = new FormData();
    form.append('product_id', String(productId));

    try {
      const response = await firstValueFrom(
        this.http.post<{ status: string; id?: number; message?: string }>(
          `${this.baseUrl}/chat_open.php`,
          form,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success' || !response.id) {
        throw new Error(response.message ?? '無法開啟對話');
      }

      return Number(response.id);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(error.status === 401 ? '請先登入' : '無法開啟對話');
      }

      throw error;
    }
  }

  /** 單一會話詳情：商品、對方、訊息、議價 */
  async detail(conversationId: number): Promise<ConversationDetailResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<{
          status: string;
          data?: ConversationDetail;
          messages?: ChatMessage[];
          offers?: Offer[];
          message?: string;
        }>(`${this.baseUrl}/chat_detail.php`, {
          params: { id: conversationId },
          headers: this.auth.authHeaders(),
        }),
      );

      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message ?? '無法取得對話');
      }

      return {
        conversation: response.data,
        messages: response.messages ?? [],
        offers: response.offers ?? [],
      };
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(error.status === 403 ? '沒有權限查看這個對話' : '無法取得對話');
      }

      throw error;
    }
  }

  /**
   * 連上某條會話。EventSource 不能自訂 header，token 改走 query，
   * 後端仍會驗證是否為會話成員。
   */
  connect(conversationId: number, onEvent: (event: ChatStreamEvent) => void): () => void {
    this.disconnect();

    const token = encodeURIComponent(this.auth.token);
    const source = new EventSource(
      `${this.baseUrl}/chat_stream.php?conversation_id=${conversationId}&token=${token}`,
    );

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        onEvent(JSON.parse(event.data) as ChatStreamEvent);
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

  /** 取得「我」的所有會話摘要；身份由後端依 token 判定 */
  async getConversations(): Promise<ConversationSummary[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; data?: ConversationSummary[]; message?: string }>(
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
  async send(conversationId: number, content: string, image?: File | null): Promise<void> {
    const form = new FormData();
    form.append('conversation_id', String(conversationId));
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

  /** 取得目前買家對這件商品的最新出價；沒有出價回 null */
  async offerState(productId: number): Promise<OfferState | null> {
    const response = await firstValueFrom(
      this.http.get<{ status: string; data?: OfferState | null; message?: string }>(
        `${this.baseUrl}/offer_state.php`,
        {
          params: { product_id: productId },
          headers: this.auth.authHeaders(),
        },
      ),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '無法取得出價狀態');
    }

    return response.data ?? null;
  }

  /** 買家對會話提出議價；出價卡片會透過 SSE 快照出現在聊天室 */
  async createOffer(conversationId: number, amount: number): Promise<void> {
    const form = new FormData();
    form.append('conversation_id', String(conversationId));
    form.append('amount', String(amount));

    try {
      const response = await firstValueFrom(
        this.http.post<{ status: string; message?: string }>(
          `${this.baseUrl}/offer_create.php`,
          form,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success') {
        throw new Error(response.message ?? '出價失敗');
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const message = (error.error as { message?: string } | null)?.message;
        throw new Error(message ?? (error.status === 401 ? '請先登入' : '出價失敗，請稍後再試'));
      }

      throw error;
    }
  }

  /** 賣家回覆議價；同意/拒絕後後端會自動發一則系統提示訊息 */
  async replyOffer(offerId: number, action: 'accept' | 'reject'): Promise<'accepted' | 'rejected'> {
    const form = new FormData();
    form.append('offer_id', String(offerId));
    form.append('action', action);

    try {
      const response = await firstValueFrom(
        this.http.post<{ status: string; message?: string; offer_status?: 'accepted' | 'rejected' }>(
          `${this.baseUrl}/offer_reply.php`,
          form,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success' || !response.offer_status) {
        throw new Error(response.message ?? '回覆失敗');
      }

      return response.offer_status;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(error.status === 401 ? '登入已過期，請重新登入' : '回覆失敗，請稍後再試');
      }

      throw error;
    }
  }
}
