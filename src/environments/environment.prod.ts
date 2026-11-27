export const environment = {
  production: true,
  /**
   * 線上版後端網址（Cloudflare 臨時通道 → 指向本機 XAMPP 的 Apache）。
   * 注意：這是 quick tunnel 的隨機網址，cloudflared 重新啟動就會改變，
   * 屆時要更新這裡並重新 build。
   */
  apiBaseUrl: 'https://starring-tri-freeze-sagem.trycloudflare.com/remarket-backend',
};
