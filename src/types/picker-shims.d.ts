/**
 * expo-image-picker / expo-document-picker の最小型定義。
 * `npx expo install expo-image-picker expo-document-picker` を実行して
 * 実パッケージがインストールされると、そちらの型が使われます。
 * （node_modules 未インストール環境でも型チェックを通すためのシム）
 */
declare module "expo-image-picker" {
  export type ImagePickerAsset = {
    uri: string;
    fileName?: string | null;
    mimeType?: string;
    width: number;
    height: number;
  };

  export type ImagePickerResult = {
    canceled: boolean;
    assets: ImagePickerAsset[] | null;
  };

  export function launchImageLibraryAsync(options?: {
    mediaTypes?: unknown;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePickerResult>;

  export function requestMediaLibraryPermissionsAsync(): Promise<{
    granted: boolean;
  }>;
}

declare module "expo-document-picker" {
  export type DocumentPickerAsset = {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
  };

  export type DocumentPickerResult = {
    canceled: boolean;
    assets: DocumentPickerAsset[] | null;
  };

  export function getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<DocumentPickerResult>;
}
