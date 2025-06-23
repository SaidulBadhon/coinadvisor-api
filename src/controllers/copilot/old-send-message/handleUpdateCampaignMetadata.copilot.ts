import Campaign from "../../../models/campaign.model";

const handleUpdateCampaignMetadata = async ({
  ctx,
  conversation,
  args,
}: {
  ctx: any;
  conversation: any;
  args: any;
}) => {
  console.log("handleUpdateCampaignMetadata: ", args);

  const campaignId = conversation.campaignId;
  if (!campaignId) {
    return ctx.json({
      success: false,
      message: "Campaign ID not found in conversation",
    });
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return ctx.json({
      success: false,
      message: "Campaign not found",
    });
  }

  // Extract campaign metadata from args
  const updates: any = {};

  if (args.campaignName) updates.name = args.campaignName;
  if (args.campaignDescription) updates.description = args.campaignDescription;
  if (args.campaignGoal) updates.goal = args.campaignGoal;
  if (args.campaignWritingStyle)
    updates.writingStyle = args.campaignWritingStyle;
  if (args.campaignCTA) updates.url = args.campaignCTA; // Assuming CTA is a URL

  // Handle campaign duration updates
  if (args.campaignDuration) {
    if (args.campaignDuration.startDate)
      updates.startDate = args.campaignDuration.startDate;
    if (args.campaignDuration.endDate)
      updates.endDate = args.campaignDuration.endDate;
  }

  // Update the campaign with the new metadata
  const updatedCampaign = await Campaign.findByIdAndUpdate(
    campaignId,
    updates,
    { new: true }
  );

  // Update the conversation metadata
  conversation.metadata.pendingAction = true;
  conversation.messages.push({
    role: "assistant",
    content: args.summary || "Campaign metadata updated successfully",
    timestamp: new Date(),
  });

  await conversation.save();

  return ctx.json({
    success: true,
    data: {
      message: args.summary || "Campaign metadata updated successfully",
      conversationId: conversation._id,
      campaignId: campaignId,
      trigger: "update-campaign-metadata",
    },
  });
};

export default handleUpdateCampaignMetadata;
