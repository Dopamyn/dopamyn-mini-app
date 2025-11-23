import { redirect } from "next/navigation"

export default async function OldProfileRedirect({ params }: { params: { profileName: string } }) {
  const { profileName } = await params
  
  // Redirect to the new kols route
  redirect(`/kols/${profileName}`)
}
