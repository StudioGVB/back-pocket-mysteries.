export async function duplicateCampaign(supabase: any, campaignId: string): Promise<string> {
  const { data: source, error: fetchError } = await supabase
    .from("edm_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (fetchError || !source) {
    throw new Error(fetchError?.message || "Source campaign not found");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("edm_campaigns")
    .insert({
      subject: `${source.subject} (Copy)`,
      preheader: source.preheader,
      status: "draft",
      scheduled_at: null,
      scheduled_at_tz: source.scheduled_at_tz || "Australia/Sydney",
      audience_type: source.audience_type || "group",
      audience_group_id: source.audience_group_id,
      from_name: source.from_name || "Gabby from Back Pocket Mysteries",
      from_email: source.from_email || "hello@backpocketmysteries.com",
      blocks_json: source.blocks_json || [],
      html_content: source.html_content || "",
      global_styles_json: source.global_styles_json || {},
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to duplicate campaign");
  }

  return inserted.id;
}
