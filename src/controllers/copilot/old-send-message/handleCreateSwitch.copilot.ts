import { Post } from "../../../models";
import { createTextPostContent } from "../../post/text.v1.controller";
import { createImagePost } from "../../post/image.controller";
import { createVideoPost } from "../../post/video.controller";
import { createCampaign } from "../../post/campaign.controller";

const handleCreateSwitch = async ({
  ctx,
  conversation,
  args,
  userId,
  author,
  authorType,
}: {
  ctx: any;
  conversation: any;
  args: any;
  userId: any;
  author: any;
  authorType: any;
}) => {
  console.log("handleCreateSwitch: ", args);

  // check action
  if (args.action === "create_post") {
    // check if there is a postId
    const postId = conversation.postId;
    let post: any;

    if (postId) {
      // update the post
      post = await Post.findOneAndUpdate(
        { _id: postId },
        {
          type: args.postType,
          prompt: args.prompt,
          platform: "linkedin",
          author,
          authorType,
        }
      );
    } else {
      // create a new post
      post = await Post.create({
        createdBy: userId,
        isAiGenerated: true,
        status: "draft",
        error: "",
        errorMessage: "",
        commentary: "",
        media: [],
        type: args.format || "text",
        prompt: args.prompt,
        platform: "linkedin",
        author,
        authorType,
      });
    }

    // Generate commentary if the prompt is available
    if (args.prompt && (!post.commentary || post.commentary.trim() === "")) {
      try {
        console.log("Generating commentary from prompt:", args.prompt);
        const newCommentary = await createTextPostContent({
          context: post.commentary,
          preference: {
            prompt: args.prompt,
            webSearch: true,
          },
        });

        // Update the post with the generated commentary
        post = await Post.findByIdAndUpdate(
          post._id,
          { commentary: newCommentary },
          { new: true }
        );

        console.log("Generated commentary:", newCommentary);
      } catch (error) {
        console.error("Error generating commentary:", error);
        // Don't fail the whole operation if commentary generation fails
      }
    }

    // Generate media based on post type
    if (post.type === "image" || post.type === "image post") {
      try {
        // Update post status to indicate loading
        post = await Post.findByIdAndUpdate(
          post._id,
          { status: "generating" },
          { new: true }
        );

        // Check if the post has commentary to use as prompt
        if (!post.commentary) {
          console.log("Cannot generate image: Post missing commentary");
        } else {
          // Create a mock request context with the necessary data for image generation
          const mockReq = {
            json: () => ({
              prompt: post.commentary,
              config: {
                style: "professional",
                aspectRatio: "1.91:1",
                n: 1,
              },
              postId: post._id,
            }),
          };

          const mockCtx = {
            req: mockReq,
            get: (key: string) => (key === "userId" ? post.createdBy : null),
            json: (data: any) => {
              console.log("Image generation result:", data);
              return data;
            },
          };

          // Call the image generation function
          await createImagePost(mockCtx);

          // Reset status to draft after generation
          await Post.findByIdAndUpdate(post._id, { status: "draft" });
        }
      } catch (error: any) {
        console.error("Error generating image:", error);
        // Update post with error information
        await Post.findByIdAndUpdate(post._id, {
          status: "draft",
          errorMessage: error.message || "Error generating image",
        });
      }
    } else if (post.type === "video") {
      try {
        // Update post status to indicate loading
        post = await Post.findByIdAndUpdate(
          post._id,
          { status: "generating" },
          { new: true }
        );

        // Check if the post has commentary to use as prompt
        if (!post.commentary) {
          console.log("Cannot generate video: Post missing commentary");
        } else {
          // Create a mock request context with the necessary data for video generation
          const mockReq = {
            json: () => ({
              prompt: post.commentary,
              config: {
                aspectRatio: "16:9",
                duration: "5s",
              },
              postId: post._id,
            }),
          };

          const mockCtx = {
            req: mockReq,
            get: (key: string) => (key === "userId" ? post.createdBy : null),
            json: (data: any) => {
              console.log("Video generation result:", data);
              return data;
            },
          };

          // Call the video generation function
          await createVideoPost(mockCtx);

          // Note: We don't reset status here as video processing continues in the background
          // The video controller will update the status when processing is complete
        }
      } catch (error: any) {
        console.error("Error generating video:", error);
        // Update post with error information
        await Post.findByIdAndUpdate(post._id, {
          status: "draft",
          errorMessage: error.message || "Error generating video",
        });
      }
    }

    conversation.metadata.pendingAction = true;
    conversation.postId = post._id;

    // Determine appropriate message based on post type
    let responseMessage = args.summary || "Post created";
    let triggerAction = "create-post";

    if (post.type === "video") {
      responseMessage =
        args.summary ||
        "Creating video post. This may take a few minutes to process.";
      triggerAction = "create-post-video";
    } else if (post.type === "image" || post.type === "image post") {
      responseMessage =
        args.summary || "Creating image post. Generating image...";
    }

    // update the conversation with message
    conversation.messages.push({
      role: "assistant",
      content: responseMessage,
      createdAt: new Date(),
    });

    await conversation.save();

    return ctx.json({
      success: true,
      data: {
        message: responseMessage,
        conversationId: conversation._id,
        postId: conversation.postId || post._id,
        trigger: triggerAction,
        postType: post.type,
      },
    });

    // update the conversation with the postId
  } else if (args.action === "create_campaign") {
    // Extract campaign metadata from args
    const campaignData = args.campaign || {};
    const today = new Date().toISOString().split("T")[0];

    // Set default values for required fields
    const startDate = campaignData.campaignDuration?.startDate || today;
    const endDate =
      campaignData.campaignDuration?.endDate ||
      new Date(new Date().setDate(new Date().getDate() + 7))
        .toISOString()
        .split("T")[0]; // Default to 1 week from today

    // Prepare campaign data
    const campaignName =
      campaignData.campaignName ||
      args.prompt?.substring(0, 50) ||
      "Untitled Campaign";
    const campaignDescription =
      campaignData.campaignDescription || args.prompt || "";
    const campaignGoal = campaignData.campaignGoal || "";
    const campaignWritingStyle =
      campaignData.campaignWritingStyle || "professional";

    // Create a mock context to call the campaign controller
    const mockCtx = {
      get: (key: string) => {
        if (key === "userId") return userId;
        return null;
      },
      req: {
        json: () => ({
          name: campaignName,
          description: campaignDescription,
          today: today,
          startDate: startDate,
          endDate: endDate,
          type: args.format || "text",
          status: "draft",
          goal: campaignGoal,
          includeHoliday: false,
          theme: "",
          tone: campaignWritingStyle,
          url: "",
          platform: "linkedin",
          author: author,
          authorType: authorType,
        }),
      },
      json: (response: any) => response,
    };

    // Call the campaign controller to create the campaign and its posts
    const result = await createCampaign(mockCtx);
    console.log("Campaign creation result:", result);

    if (!result.success) {
      return ctx.json({
        success: false,
        message: result.message || "Failed to create campaign",
      });
    }

    const campaignId = result.data?.campaignId;

    // Update conversation with campaign ID and metadata
    conversation.metadata.pendingAction = true;
    conversation.metadata.contentType = "campaign";
    conversation.metadata.contentFormat = args.format || "text";
    conversation.metadata.topic = args.prompt;
    conversation.metadata.estimatedPostCount = args.estimatedPostCount || 3;
    conversation.campaignId = campaignId;

    // Add message to conversation
    conversation.messages.push({
      role: "assistant",
      content: args.summary || "Campaign created",
      createdAt: new Date(),
    });

    await conversation.save();

    return ctx.json({
      success: true,
      data: {
        message: args.summary,
        conversationId: conversation._id,
        campaignId: campaignId,
      },
    });
  }

  //

  // return ctx.json({
  //   success: true,
  //   data: {
  //     message: args.summary,
  //     conversationId: conversation._id,
  //   },
  // });
};

export default handleCreateSwitch;
