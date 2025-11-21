use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Create a poll in a community
/// 
/// Poll options are existing user profiles (Pubkeys).
/// 
/// Validation:
/// - Creator must be a member of the community
/// - Question URI must be within length limits
/// - Must have at least 2 options and no more than MAX_POLL_OPTIONS
/// - End time must be in the future
/// 
/// Events: PollCreated
#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub community: Account<'info, CommunityAccount>,
    
    #[account(
        seeds = [MEMBERSHIP_SEED, community.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(
        init,
        payer = creator,
        space = POLL_SIZE,
        seeds = [POLL_SEED, community.key().as_ref(), &community.poll_counter.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, PollAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_poll(
    ctx: Context<CreatePoll>,
    question_uri: String,
    option_profiles: Vec<Pubkey>,
    end_time: i64,
) -> Result<()> {
    // Validate question URI length
    require!(
        question_uri.len() <= MAX_QUESTION_URI_LEN,
        SocialError::QuestionUriTooLong
    );
    
    // Validate number of options
    require!(
        option_profiles.len() >= 2 && option_profiles.len() <= MAX_POLL_OPTIONS,
        SocialError::TooManyPollOptions
    );
    
    let clock = Clock::get()?;
    
    // Validate end time is in the future
    require!(
        end_time > clock.unix_timestamp,
        SocialError::PollEnded
    );
    
    let community = &mut ctx.accounts.community;
    let poll = &mut ctx.accounts.poll;
    
    let poll_id = community.poll_counter;
    
    // Initialize vote counts to zero for each option
    let votes_per_option = vec![0u32; option_profiles.len()];
    
    poll.community = community.key();
    poll.poll_id = poll_id;
    poll.question_uri = question_uri;
    poll.option_profiles = option_profiles;
    poll.votes_per_option = votes_per_option;
    poll.created_by = ctx.accounts.creator.key();
    poll.end_time = end_time;
    poll.created_at = clock.unix_timestamp;
    
    // Increment community poll counter
    community.poll_counter = community.poll_counter
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(PollCreated {
        poll: poll.key(),
        community: community.key(),
        poll_id,
        creator: poll.created_by,
        end_time,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
