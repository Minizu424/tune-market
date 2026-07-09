// テンプレート由来の CSS import を型チェックに通すための宣言
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.css";
