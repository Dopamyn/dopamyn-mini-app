"use client";

import { QuestCreationLanding } from "@/app/components/campaigns/QuestCreationLanding";
import { useRouter } from "next/navigation";

export default function CreateCampaignPage() {
  const router = useRouter();

  const handleStartNewQuest = () => {
    // Navigate to /create/new to start a new campaign
    router.push("/campaigns/create/new");
  };

  const handleSelectTemplate = (templateId: string) => {
    // Navigate to /create/new with the template ID as a query parameter
    router.push(`/campaigns/create/new?templateId=${templateId}`);
  };

  const handleSelectDraft = (draftId: string) => {
    // Navigate to /create/new with the draft ID as a query parameter
    router.push(`/campaigns/create/new?draftId=${draftId}`);
  };

  const handleDeleteDraft = (draftId: string) => {
    // Draft deletion is handled in QuestCreationLanding component
    // This callback is for any additional cleanup if needed
  };

  return (
    <QuestCreationLanding
      onStartNewQuest={handleStartNewQuest}
      onSelectTemplate={handleSelectTemplate}
      onSelectDraft={handleSelectDraft}
      onDeleteDraft={handleDeleteDraft}
    />
  );
}
