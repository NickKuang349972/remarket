/// <reference types="jest" />
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const apiUrl = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getProducts()', () => {
    it('回傳後端的商品陣列', async () => {
      const promise = service.getProducts();

      const req = httpMock.expectOne(`${apiUrl}/get_products.php`);
      expect(req.request.method).toBe('GET');

      req.flush({
        status: 'success',
        data: [{ id: 1, title: 'Test' }],
      });

      await expect(promise).resolves.toEqual([{ id: 1, title: 'Test' }]);
    });

    it('後端回傳 error 時拋出錯誤', async () => {
      const promise = service.getProducts();
      const assertion = expect(promise).rejects.toThrow('Failed');

      const req = httpMock.expectOne(`${apiUrl}/get_products.php`);
      req.flush({ status: 'error', message: 'Failed' });

      await assertion;
    });
  });

  describe('imageUrl()', () => {
    it('相對路徑會拼接 apiBaseUrl', () => {
      expect(service.imageUrl('uploads/test.jpg')).toBe(`${apiUrl}/uploads/test.jpg`);
    });

    it('空值回傳 undefined', () => {
      expect(service.imageUrl(undefined)).toBeUndefined();
      expect(service.imageUrl('')).toBeUndefined();
    });

    it('已經是完整網址時原樣回傳', () => {
      const url = 'https://cdn.example.com/products/test.jpg';
      expect(service.imageUrl(url)).toBe(url);
    });
  });
});
