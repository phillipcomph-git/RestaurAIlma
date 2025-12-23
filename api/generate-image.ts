
export default async function handler(req: any, res: any) {
  res.status(200).json({ message: "Endpoint desativado. Use o processamento client-side." });
}
