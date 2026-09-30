import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BrandRecord,
  CreateBrandInput,
  CreateThemeInput,
  ThemeRecord,
  UpdateBrandInput,
  UpdateThemeInput,
} from '@studiohouse/models';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** A failed API call with the server's message and any field issues. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** Thin, typed client for `/studios/:studioId/brands` and `/themes`. */
@Injectable({ providedIn: 'root' })
export class BrandsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listBrands(studioId: string): Promise<BrandRecord[]> {
    return this.call(
      this.http.get<BrandRecord[]>(this.url(studioId, 'brands')),
    );
  }

  getBrand(studioId: string, brandId: string): Promise<BrandRecord> {
    return this.call(
      this.http.get<BrandRecord>(this.url(studioId, `brands/${brandId}`)),
    );
  }

  createBrand(studioId: string, input: CreateBrandInput): Promise<BrandRecord> {
    return this.call(
      this.http.post<BrandRecord>(this.url(studioId, 'brands'), input),
    );
  }

  updateBrand(
    studioId: string,
    brandId: string,
    input: UpdateBrandInput,
  ): Promise<BrandRecord> {
    return this.call(
      this.http.patch<BrandRecord>(
        this.url(studioId, `brands/${brandId}`),
        input,
      ),
    );
  }

  deleteBrand(studioId: string, brandId: string): Promise<void> {
    return this.call(
      this.http.delete<void>(this.url(studioId, `brands/${brandId}`)),
    );
  }

  listThemes(studioId: string): Promise<ThemeRecord[]> {
    return this.call(
      this.http.get<ThemeRecord[]>(this.url(studioId, 'themes')),
    );
  }

  createTheme(studioId: string, input: CreateThemeInput): Promise<ThemeRecord> {
    return this.call(
      this.http.post<ThemeRecord>(this.url(studioId, 'themes'), input),
    );
  }

  updateTheme(
    studioId: string,
    themeId: string,
    input: UpdateThemeInput,
  ): Promise<ThemeRecord> {
    return this.call(
      this.http.put<ThemeRecord>(
        this.url(studioId, `themes/${themeId}`),
        input,
      ),
    );
  }

  deleteTheme(studioId: string, themeId: string): Promise<void> {
    return this.call(
      this.http.delete<void>(this.url(studioId, `themes/${themeId}`)),
    );
  }

  private url(studioId: string, path: string): string {
    return `${this.base}/studios/${studioId}/${path}`;
  }

  private async call<T>(request: import('rxjs').Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const body = err.error as {
          error?: string;
          issues?: { path: string; message: string }[];
        } | null;
        throw new ApiError(
          err.status,
          body?.error ?? err.message,
          body?.issues ?? [],
        );
      }
      throw err;
    }
  }
}
