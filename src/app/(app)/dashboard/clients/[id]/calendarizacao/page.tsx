import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function LegacyCalendarizacaoRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/clients/${id}/calendar`);
}

