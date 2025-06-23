import { Post } from "../../../models";
import { createImagePost } from "../../post/image.controller";
import { createTextPostContent } from "../../post/text.v1.controller";
import { createVideoPost } from "../../post/video.controller";

const handleUpdatePostMetadataSwitch = async ({
  ctx,
  conversation,
  args,
}: {
  ctx: any;
  conversation: any;
  args: any;
}) => {
  console.log("handleUpdatePostMetadataSwitch: ", args);
  console.log("Calling handleUpdatePostMetadata", args.kind);

  const postId = conversation.postId;
  if (!postId) {
    return ctx.json({
      success: false,
      message: "Post ID not found in conversation",
    });
  }

  let payload = {
    ...args,
    status: "draft",
  };

  if (args.format) payload.type = args.format;
  console.log("payload: ", payload);

  // Update the post with the new metadata
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { ...payload },
    { new: true, upsert: true }
  );

  // Generate commentary if it doesn't exist and we have a prompt
  if (
    (!updatedPost.commentary || updatedPost.commentary.trim() === "") &&
    args.prompt
  ) {
    try {
      console.log("Generating commentary from prompt:", args.prompt);
      const newCommentary = await createTextPostContent({
        context: updatedPost.commentary,
        preference: {
          prompt: args.prompt,
          webSearch: true,
        },
      });

      // Update the post with the generated commentary
      await Post.findByIdAndUpdate(
        postId,
        { commentary: newCommentary },
        { new: true }
      );

      console.log("Generated commentary:", newCommentary);
    } catch (error) {
      console.error("Error generating commentary:", error);
      // Don't fail the whole operation if commentary generation fails
    }
  }

  // Automatically generate media based on post type
  const post = await Post.findById(postId);
  if (!post || !post.commentary) {
    console.log("Cannot generate media: Post not found or missing commentary");
  } else {
    // Handle different post types
    if (payload.type === "image" || payload.type === "image post") {
      try {
        console.log("Generating image for post...");
        // Update post status to indicate loading
        await Post.findByIdAndUpdate(postId, { status: "generating" });

        // Create a mock request context with the necessary data for image generation
        const mockReq = {
          json: () => ({
            prompt: post.commentary,
            config: {
              style: "professional",
              aspectRatio: "1.91:1",
              n: 1,
            },
            postId: postId,
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
        await Post.findByIdAndUpdate(postId, { status: "draft" });
      } catch (error: any) {
        console.error("Error generating image:", error);
        // Reset status to draft if there was an error
        await Post.findByIdAndUpdate(postId, {
          status: "draft",
          errorMessage: error.message || "Error generating image",
        });
      }
    } else if (payload.type === "video") {
      try {
        console.log("Generating video for post...");
        // Update post status to indicate loading
        await Post.findByIdAndUpdate(postId, { status: "generating" });

        // Create a mock request context with the necessary data for video generation
        const mockReq = {
          json: () => ({
            prompt: post.commentary,
            config: {
              aspectRatio: "16:9",
              duration: "5s",
            },
            postId: postId,
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
      } catch (error: any) {
        console.error("Error generating video:", error);
        // Reset status to draft if there was an error
        await Post.findByIdAndUpdate(postId, {
          status: "draft",
          errorMessage: error.message || "Error generating video",
        });
      }
    }
  }

  // Update the conversation metadata
  conversation.metadata.pendingAction = true;

  // Determine appropriate message based on post type
  let responseMessage = args.summary || "Post metadata updated successfully";
  let triggerAction = "update-post-metadata";

  if (payload.type === "video") {
    responseMessage =
      args.summary ||
      "Converting to video post. This may take a few minutes to process.";
    triggerAction = "update-post-metadata-video";
  } else if (payload.type === "image" || payload.type === "image post") {
    responseMessage =
      args.summary || "Converting to image post. Generating image...";
  }

  conversation.messages.push({
    role: "assistant",
    content: responseMessage,
    timestamp: new Date(),
  });

  await conversation.save();

  return ctx.json({
    success: true,
    data: {
      message: responseMessage,
      conversationId: conversation._id,
      trigger: triggerAction,
      postId: postId,
      postType: payload.type,
    },
  });
};

export default handleUpdatePostMetadataSwitch;
