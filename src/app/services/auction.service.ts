import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type AuctionState = 'scheduled' | 'live' | 'ended';

export interface Auction {
  id: number;
  product_id: number;
  seller: string;
  start_at: string;
  end_at: string;
  start_price: number;
  min_increment: number;
  title: string;
  price?: number;
  description?: string;
  address?: string;
  category?: string;
  image?: string;
  current_bid?: number | null;
  bid_count?: number;
  leader?: string | null;
  state: AuctionState;
}

export interface Bid {
  id: number;
  bidder: string;
  amount: number;
  created_at: string;
}

export interface AuctionMessage {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface AuctionDetail {
  data: Auction;
  bids: Bid[];
  messages: AuctionMessage[];
}

export interface CreateAuctionInput {
  productId: number;
  startAt: string;
  endAt: string;
  startPrice: number;
  minIncrement: number;
}

/** 拍賣：列表、詳情、建立、出價、房間訊息、SSE 即時出價 */
@Injectable({ providedIn: 'root' })
export class AuctionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;
  /** 給模板組圖片網址用 */
  readonly imageUrlBase = environment.apiBaseUrl;
  private source?: EventSource;

  async list(): Promise<Auction[]> {    const response = await firstValueFrom(
      this.http.get<{ status: string; data?: Auction[]; message?: string }>(
        `${this.baseUrl}/auctions.php`,
      ),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '無法取得拍賣列表');
    }

    return response.data ?? [];
  }

  async detail(id: number): Promise<AuctionDetail> {
    const response = await firstValueFrom(
      this.http.get<{
        status: string;
        data?: Auction;
        bids?: Bid[];
        messages?: AuctionMessage[];
        message?: string;
      }>(`${this.baseUrl}/auction_detail.php`, { params: { id } }),
    );

    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message ?? '無法取得拍賣詳情');
    }

    return {
      data: response.data,
      bids: response.bids ?? [],
      messages: response.messages ?? [],
    };
  }

  async create(input: CreateAuctionInput): Promise<number | undefined> {
    const form = new FormData();
    form.append('product_id', String(input.productId));
    form.append('start_at', input.startAt);
    form.append('end_at', input.endAt);
    form.append('start_price', String(input.startPrice));
    form.append('min_increment', String(input.minIncrement));

    const response = await firstValueFrom(
      this.http.post<{ status: string; id?: number; message?: string }>(
        `${this.baseUrl}/auction_create.php`,
        form,
        { headers: this.auth.authHeaders() },
      ),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '建立拍賣失敗');
    }

    return response.id;
  }

  async bid(auctionId: number, amount: number): Promise<void> {
    const form = new FormData();
    form.append('auction_id', String(auctionId));
    form.append('amount', String(amount));

    try {
      const response = await firstValueFrom(
        this.http.post<{ status: string; message?: string }>(
          `${this.baseUrl}/auction_bid.php`,
          form,
          { headers: this.auth.authHeaders() },
        ),
      );

      if (response.status !== 'success') {
        throw new Error(response.message ?? '出價失敗');
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new Error(error.status === 401 ? '請先登入' : '出價失敗，請稍後再試');
      }

      throw error;
    }
  }

  async postMessage(auctionId: number, content: string): Promise<void> {
    const form = new FormData();
    form.append('auction_id', String(auctionId));
    form.append('content', content);

    const response = await firstValueFrom(
      this.http.post<{ status: string; message?: string }>(
        `${this.baseUrl}/auction_message.php`,
        form,
        { headers: this.auth.authHeaders() },
      ),
    );

    if (response.status !== 'success') {
      throw new Error(response.message ?? '發送失敗');
    }
  }

  /** 訂閱即時出價；回傳斷線函式 */
  streamBids(auctionId: number, onBid: (bid: Bid) => void): () => void {
    this.disconnect();

    const source = new EventSource(`${this.baseUrl}/auction_stream.php?auction_id=${auctionId}`);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        onBid(JSON.parse(event.data) as Bid);
      } catch {
        // 忽略格式錯誤
      }
    };

    this.source = source;

    return () => this.disconnect();
  }

  disconnect() {
    this.source?.close();
    this.source = undefined;
  }
}
