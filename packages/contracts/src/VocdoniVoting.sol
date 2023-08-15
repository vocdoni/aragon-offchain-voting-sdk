// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.17;


import {SafeCastUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import {IVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/utils/IVotesUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {IDAO} from "@aragon/osx/core/dao/IDAO.sol";
import {PluginUUPSUpgradeable} from "@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol";
import {RATIO_BASE, RatioOutOfBounds} from "@aragon/osx/plugins/utils/Ratio.sol";
import {Addresslist} from "@aragon/osx/plugins/utils/Addresslist.sol";

import {VocdoniProposalUpgradeable} from "./VocdoniProposalUpgradeable.sol";
import {IVocdoniVoting} from "./IVocdoniVoting.sol";

/// @title VocdoniVoting
/// @author Vocdoni
/// @notice The Vocdoni off-chain voting data contract for the OSX plugin.
/// @notice The voting Proposal is managed off-chain on the Vocdoni blockchain.
contract VocdoniVoting is IVocdoniVoting, PluginUUPSUpgradeable, VocdoniProposalUpgradeable, Addresslist {

    using SafeCastUpgradeable for uint256;

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID of the contract.
    bytes4 internal constant VOCDONI_INTERFACE_ID =
        this.initialize.selector ^
            this.addCommitteeMembers.selector ^
            this.removeCommitteeMembers.selector ^
            this.isCommitteeMember.selector ^
            this.setTally.selector ^
            this.approveTally.selector ^
            this.executeProposal.selector;

    /// @notice The ID of the permission required to update the plugin settings.
    bytes32 public constant UPDATE_PLUGIN_SETTINGS_PERMISSION_ID =
        keccak256("UPDATE_PLUGIN_SETTINGS_PERMISSION");

    /// @notice The ID of the permission required to add/remove committee members.
    bytes32 public constant UPDATE_PLUGIN_COMMITTEE_PERMISSION_ID =
        keccak256("UPDATE_PLUGIN_COMMITTEE_PERMISSION");

    /// @notice Emitted when the plugin settings are updated.
    /// @param onlyCommitteeProposalCreation If true, only committee members can create proposals.
    /// @param minTallyApprovals The minimum number of approvals required for a tally to be considered accepted.
    /// @param minDuration The minimum duration of a propsal.
    /// @param minParticipation The minimum participation value. Its value has to be in the interval [0, 10^6] defined by `RATIO_BASE = 10**6`.
    /// @param supportThreshold The support threshold value. Its value has to be in the interval [0, 10^6] defined by `RATIO_BASE = 10**6`.
    /// @param daoTokenAddress The address of the DAO token.
    /// @param censusStrategy The predicate of the census strategy to be used in the proposals. See: https://github.com/vocdoni/census3 
    /// @param minProposerVotingPower The minimum voting power required to create a proposal. Voting power is extracted from the DAO token
    event PluginSettingsUpdated(
        bool onlyCommitteeProposalCreation,
        uint16 minTallyApprovals,
        uint64 minDuration,
        uint32 minParticipation,
        uint32 supportThreshold,
        address daoTokenAddress,
        string censusStrategy,
        uint256 minProposerVotingPower
    );

    /// @notice Emitted when one or more committee members are added.
    /// @param newMembers The addresses of the new committee members.
    event CommitteeMembersAdded(address[] indexed newMembers);

    /// @notice Emitted when one or more committee member are removed.
    /// @param removedMembers The addresses of the removed committee members.
    event CommitteeMembersRemoved(address[] indexed removedMembers);

    /// @notice Emitted when the tally of a proposal is set.
    /// @param proposalId The ID of the proposal.
    /// @param tally The tally.
    event TallySet(uint256 indexed proposalId, uint256[][] tally);

    /// @notice Emitted when the tally of a proposal is approved.
    /// @param proposalId The ID of the proposal.
    event TallyApproved(uint256 indexed proposalId);

    /// @notice Thrown if the address list length is out of bounds.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error AddresslistLengthOutOfBounds(uint16 limit, uint256 actual);

    /// @notice Thrown if the minimal approvals value is out of bounds (less than 1 or greater than the number of members in the address list).
    /// @param limit The maximal value.
    /// @param actual The actual value.
    error MinApprovalsOutOfBounds(uint16 limit, uint16 actual);

    /// @notice Thrown if the minimal duration value is out of bounds (less than one hour or greater than 1 year).
    /// @param limit The limit value.
    /// @param actual The actual value.
    error MinDurationOutOfBounds(uint64 limit, uint64 actual);

    /// @notice Thrown if the start date is invalid.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error InvalidStartDate(uint64 limit, uint64 actual);

    /// @notice Thrown if the end date is invalid.
    /// @param limit The limit value.
    /// @param actual The actual value.
    error InvalidEndDate(uint64 limit, uint64 actual);

    /// @notice Thrown if the expiration date is invalid.
    /// @param limit The expiration date.
    /// @param actual The actual value.
    error InvalidExpirationDate(uint64 limit, uint64 actual);

    /// @notice Thrown if the plugin settings are updated too recently.
    /// @param lastUpdate The block number of the last update.
    error PluginSettingsUpdatedTooRecently(uint64 lastUpdate, uint64 securityBlock);

    /// @notice Thrown if the proposal is already executed.
    /// @param proposalId The ID of the proposal.
    error ProposalAlreadyExecuted(uint256 proposalId);

    /// @notice Thrown if the proposal tally is invalid.
    /// @param tally The tally of the proposal.
    error InvalidTally(uint256[][] tally);

    /// @notice Thrown if the proposal tally is already set and approved.
    /// @param approvals The number of approvals.
    /// @param minApprovals The minimum number of approvals required.
    error TallyAlreadyApproved(uint256 approvals, uint16 minApprovals);

    /// @notice Thrown if the proposal tally is not approved by enough committee members.
    /// @param minApprovals The minimum number of approvals required.
    /// @param actualApprovals The actual number of approvals.
    error NotEnoughApprovals(uint16 minApprovals, uint16 actualApprovals);

    /// @notice Thrown if an address is not valid or not supported
    /// @param addr The address
    error InvalidAddress(address addr);

    /// @notice Thrown if the prosal is not in the tally phase
    /// @param startDate The start date of the proposal
    /// @param endDate The end date of the proposal
    /// @param expirationDate The expiration date of the proposal
    /// @param currentTimestamp The current timestamp
    error ProposalNotInTallyPhase(uint64 startDate, uint64 endDate, uint64 expirationDate, uint256 currentTimestamp);

    /// @notice Thrown if the msg.sender does not have enough voting power
    /// @param required The required voting power
    error NotEnoughVotingPower(uint256 required);

    /// @notice Thrown if the msg.sender is not a committee member
    /// @param sender The sender
    error OnlyCommittee(address sender);

    /// @notice Thrown if the support threshold is not reached
    /// @param currentSupport The current support
    /// @param supportThreshold The support threshold
    error SupportThresholdNotReached(uint256 currentSupport, uint32 supportThreshold);

    /// @notice Thrown if the minimum participation is not reached
    /// @param currentParticipation The current participation
    /// @param minParticipation The minimum participation
    error MinParticipationNotReached(uint256 currentParticipation,uint32 minParticipation);

    /// @notice A container for the Vocdoni voting plugin settings
    /// @param onlyCommitteeProposalCreation If true, only committee members can create proposals.
    /// @param minTallyApprovals The minimum number of approvals required for the tally to be considered valid.
    /// @param minParticipation The minimum participation value. Its value has to be in the interval [0, 10^6] defined by `RATIO_BASE = 10**6`.
    /// @param supportThreshold The support threshold value. Its value has to be in the interval [0, 10^6] defined by `RATIO_BASE = 10**6`.
    /// @param minDuration The minimum duration of a proposal.
    /// @param daoTokenAddress The address of the DAO token.
    /// @param minProposerVotingPower The minimum voting power required to create a proposal. Voting power is extracted from the DAO token
    /// @param censusStrategy The predicate of the census strategy to be used in the proposals. See: https://github.com/vocdoni/census3
    struct PluginSettings {
        bool onlyCommitteeProposalCreation;
        uint16 minTallyApprovals;
        uint32 minParticipation;
        uint32 supportThreshold;
        uint64 minDuration;
        address daoTokenAddress;
        uint256 minProposerVotingPower;
        string censusStrategy;
    }

    /// @notice A container for the proposal parameters.
    /// @param censusBlock The block number used to generate the census of the proposal
    /// @param securityBlock Block number used for limiting contract usage when plugin settings are updated
    /// @param startDate The timestamp when the proposal starts.
    /// @param endDate The timestamp when the proposal ends. At this point the tally can be set.
    /// @param expirationDate The timestamp when the proposal expires. Proposal can't be executed after.
    struct ProposalParameters {
        uint64 censusBlock;
        uint64 securityBlock;
        uint64 startDate;
        uint64 endDate;
        uint64 expirationDate;
    }

    /// @notice A container for proposal-related information.
    /// @param executed Whether the proposal is executed or not.
    /// @param vochainProposalId The ID of the proposal in the Vochain.
    /// @param allowFailureMap A bitmap allowing the proposal to succeed, even if individual actions might revert. If the bit at index `i` is 1,
    //         the proposal succeeds even if the `i`th action reverts. A failure map value of 0 requires every action to not revert.
    /// @param parameters The parameters of the proposal.
    /// @param tally The tally of the proposal.
    /// @dev tally only supports [[Yes, No, Abstain]] schema in this order. i.e [[10, 5, 2]] means 10 Yes, 5 No, 2 Abstain.
    /// @param approvers The approvers of the tally.
    /// @param actions The actions to be executed when the proposal passes.
    struct Proposal {
        bool executed;
        bytes32 vochainProposalId;
        uint256 allowFailureMap;
        ProposalParameters parameters;
        uint256[][] tally;
        address[] approvers;
        IDAO.Action[] actions;
    }

    /// @notice A mapping between proposal IDs and proposal information.
    mapping(uint256 => Proposal) private proposals;

    /// @notice The current plugin settings.
    PluginSettings private pluginSettings;

    /// @notice Keeps track at which block number the plugin settings have been changed the last time.
    /// @dev This variable prevents executing a proposal if plugin settings have been changed.
    uint64 private lastPluginSettingsChange;

    
    /// @notice Initializes the plugin.
    /// @param _dao The DAO address.
    /// @param _committeeAddresses The addresses of the committee.
    /// @param _pluginSettings The initial plugin settings.
    function initialize(IDAO _dao, address[] calldata _committeeAddresses, PluginSettings memory _pluginSettings) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        
        if (_committeeAddresses.length > type(uint16).max) {
            revert AddresslistLengthOutOfBounds({limit: type(uint16).max, actual: _committeeAddresses.length});
        }
        
        _addAddresses(_committeeAddresses);
        
        emit CommitteeMembersAdded({newMembers: _committeeAddresses});
        
        _updatePluginSettings(_pluginSettings);
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interface.
    /// @return Returns `true` if the interface is supported.
    function supportsInterface(
        bytes4 _interfaceId
    )
        public
        view
        virtual
        override(PluginUUPSUpgradeable, VocdoniProposalUpgradeable)
        returns (bool)
    {
        return
            _interfaceId == VOCDONI_INTERFACE_ID ||
            _interfaceId == type(IVocdoniVoting).interfaceId ||
            _interfaceId == type(Addresslist).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /// @inheritdoc IVocdoniVoting
    function addCommitteeMembers(
        address[] calldata _members
    ) external override auth(UPDATE_PLUGIN_COMMITTEE_PERMISSION_ID) {
        uint256 newAddresslistLength = addresslistLength() + _members.length;

        // Check if the new address list length would be greater than `type(uint16).max`, the maximal number of approvals.
        if (newAddresslistLength > type(uint16).max) {
            revert AddresslistLengthOutOfBounds({
                limit: type(uint16).max,
                actual: newAddresslistLength
            });
        }

        _addAddresses(_members);

        emit CommitteeMembersAdded({newMembers: _members});
    }

    /// @inheritdoc IVocdoniVoting
    function removeCommitteeMembers(
        address[] calldata _members
    ) external override auth(UPDATE_PLUGIN_COMMITTEE_PERMISSION_ID) {
        uint16 newAddresslistLength = uint16(addresslistLength() - _members.length);

        // Check if the new address list length would become less than the current minimum number of approvals required.
        if (newAddresslistLength < pluginSettings.minTallyApprovals) {
            revert MinApprovalsOutOfBounds({
                limit: newAddresslistLength,
                actual: pluginSettings.minTallyApprovals
            });
        }

        _removeAddresses(_members);

        emit CommitteeMembersRemoved({removedMembers: _members});
    }

    /// @inheritdoc IVocdoniVoting
    function isCommitteeMember(address _member) public view override returns (bool) {
        return _isCommitteeMember(_member);
    }

    /// @notice Internal function for checking whether an address is a committee member.
    /// @param _member The address to check.
    /// @return Whether the address is a committee member.
    function _isCommitteeMember(address _member) internal view returns (bool) {
        return isListed(_member);
    }

    /// @notice Updates the plugin settings.
    /// @param _pluginSettings The new plugin settings.
    /// @dev The called must have the UPDATE_PLUGIN_SETTINGS_PERMISSION_ID permission.
    function updatePluginSettings(PluginSettings memory _pluginSettings) public auth(UPDATE_PLUGIN_SETTINGS_PERMISSION_ID) {
        _updatePluginSettings(_pluginSettings);
    }

    /// @notice Internal function for updating the plugin settings.
    /// @param _pluginSettings The new plugin settings.
    function _updatePluginSettings(PluginSettings memory _pluginSettings) private {
        if (pluginSettings.supportThreshold > RATIO_BASE - 1) {
            revert RatioOutOfBounds({
                limit: RATIO_BASE - 1,
                actual: pluginSettings.supportThreshold
            });
        }
        
        // Require the minimum participation value to be in the interval [0, 10^6], because `>=` comparision is used in the participation criterion.
        if (pluginSettings.minParticipation > RATIO_BASE) {
            revert RatioOutOfBounds({limit: RATIO_BASE, actual: pluginSettings.minParticipation});
        }

        if (pluginSettings.minDuration > 365 days) {
            revert MinDurationOutOfBounds({limit: 365 days, actual: pluginSettings.minDuration});
        }
        
        // update plugin settings
        pluginSettings = _pluginSettings;
        lastPluginSettingsChange = uint64(block.number);

        emit PluginSettingsUpdated({
            onlyCommitteeProposalCreation: _pluginSettings.onlyCommitteeProposalCreation,
            minTallyApprovals: _pluginSettings.minTallyApprovals,
            minDuration: _pluginSettings.minDuration,
            minParticipation: _pluginSettings.minParticipation,
            supportThreshold: _pluginSettings.supportThreshold,
            daoTokenAddress: _pluginSettings.daoTokenAddress,
            censusStrategy: _pluginSettings.censusStrategy,
            minProposerVotingPower: _pluginSettings.minProposerVotingPower
        });
    }

    /// @notice Returns a proposal.
    /// @param _proposalId The ID of the proposal to return.
    /// @return executed Whether the proposal is executed or not.
    /// @return approvers The approvers of the tally.
    /// @return vochainProposalId The ID of the proposal in the Vochain.
    /// @return parameters The parameters of the proposal.
    /// @return allowFailureMap The allow failure map of the proposal.
    /// @return tally The tally of the proposal.
    /// @return actions The actions of the proposal.
    function getProposal(uint256 _proposalId) public view returns (
        bool executed,
        address[] memory approvers,
        bytes32 vochainProposalId,
        ProposalParameters memory parameters,
        uint256 allowFailureMap,
        uint256[][] memory tally,
        IDAO.Action[] memory actions
    
    ) {
        Proposal storage proposal = proposals[_proposalId];
        executed = proposal.executed;
        approvers = proposal.approvers;
        vochainProposalId = proposal.vochainProposalId;
        parameters = proposal.parameters;
        allowFailureMap = proposal.allowFailureMap;
        tally = proposal.tally;
        actions = proposal.actions;
    }

    /// @notice Internal function for creating a proposal.
    /// @param _vochainProposalId The Vocdoni proposal ID.
    /// @param _allowFailureMap The allow failure map of the proposal.
    /// @param _parameters The parameters of the proposal.
    /// @param _actions The actions of the proposal.
    /// @return The ID of the created proposal.
    function createProposal(
        bytes32 _vochainProposalId,
        uint256 _allowFailureMap,
        ProposalParameters memory _parameters,
        IDAO.Action[] memory _actions
    ) external returns (uint256) {
        if (pluginSettings.onlyCommitteeProposalCreation &&
            !_isCommitteeMember(_msgSender())
        ) {
            revert OnlyCommittee({
                sender: _msgSender()
            });
        }
        
        if (pluginSettings.minProposerVotingPower != 0 &&
            // Because of the checks in `VocdoniVotingSetup`, we can assume that `votingToken` is an [ERC-20](https://eips.ethereum.org/EIPS/eip-20) token.
            IVotesUpgradeable(pluginSettings.daoTokenAddress).getVotes(_msgSender()) < pluginSettings.minProposerVotingPower &&
            IERC20Upgradeable(pluginSettings.daoTokenAddress).balanceOf(_msgSender()) < pluginSettings.minProposerVotingPower
        ) {
            revert NotEnoughVotingPower({
                required: pluginSettings.minProposerVotingPower
            });
        }


        (_parameters.startDate,
         _parameters.endDate,
         _parameters.expirationDate) = _validateProposalDates(
            _parameters.startDate,
            _parameters.endDate,
            _parameters.expirationDate
        );

        uint256 _proposalId = _createProposalId();
        
        Proposal storage proposal = proposals[_proposalId];
        
        proposal.vochainProposalId = _vochainProposalId;
        proposal.parameters.startDate = _parameters.startDate;
        proposal.parameters.endDate = _parameters.endDate;
        proposal.parameters.expirationDate = _parameters.expirationDate;
        proposal.parameters.censusBlock = _parameters.censusBlock;
        proposal.allowFailureMap = _allowFailureMap;
        proposal.parameters.securityBlock = block.number.toUint64() - 1;
        for (uint16 i = 0; i < _actions.length; i++) {
            proposal.actions.push(_actions[i]);
        }

        emit ProposalCreated(
            _proposalId,
            _vochainProposalId,
            _msgSender(),
            _parameters.startDate,
            _parameters.endDate,
            _parameters.expirationDate,
            _actions,
            _allowFailureMap
        );

        return _proposalId;
    }

    /// @inheritdoc IVocdoniVoting
    function setTally(uint256 _proposalId, uint256[][] memory _tally) public override {
        _setTally(_proposalId, _tally);
    }   

    /// @notice Internal function for setting the tally of a given proposal.
    /// @param _proposalId The ID of the proposal to set the tally of.
    /// @param _tally The tally to set.
    /// @dev The caller must be a committee member if the ONLY_COMMITTEE_SET_TALLY flag is set.
    function _setTally(uint256 _proposalId, uint256[][] memory _tally) internal {
        if (!_isCommitteeMember(_msgSender())) {
            revert OnlyCommittee({
                sender: _msgSender()
            });
        }

        Proposal storage proposal = proposals[_proposalId];
        // if plugin settings changed since proposal creation, the proposal is no longer valid and the tally cannot be set
        if (lastPluginSettingsChange >= proposal.parameters.securityBlock) {
            revert PluginSettingsUpdatedTooRecently({
                lastUpdate: lastPluginSettingsChange,
                securityBlock: proposal.parameters.securityBlock
            });
        }

        if (!_isProposalOnTallyPhase(proposal)) {
            revert ProposalNotInTallyPhase({
                startDate: proposal.parameters.startDate,
                endDate: proposal.parameters.endDate,
                expirationDate: proposal.parameters.expirationDate,
                currentTimestamp: block.timestamp
            });
        }
        
        if (_tally.length != 1) {
            revert InvalidTally({tally: _tally});
        }

        if (_tally[0].length != 3) {
            revert InvalidTally({tally: _tally});
        }
        
        // tally already set
        if (proposal.tally.length != 0) {
            // check proposal not already approved
            if (proposal.approvers.length >= pluginSettings.minTallyApprovals) {
                revert TallyAlreadyApproved({
                    approvals: proposal.approvers.length,
                    minApprovals: pluginSettings.minTallyApprovals
                });
            }
            // check if the new tally is different
            if (_tally[0][0] == proposal.tally[0][0] &&
                _tally[0][1] == proposal.tally[0][1] &&
                _tally[0][2] == proposal.tally[0][2]
            ) {
                revert InvalidTally({tally: _tally});
            }
            // reset approvers
            proposal.approvers = new address[](0);
        }
        
        proposal.tally = _tally;
        proposal.approvers.push(_msgSender());

        emit TallySet({proposalId: _proposalId, tally: _tally});
        emit TallyApproved({proposalId: _proposalId});
    }

    /// @inheritdoc IVocdoniVoting
    function approveTally(uint256 _proposalId, bool _tryExecution) public override {
        return _approveTally(_proposalId, _tryExecution);
    }

    /// @notice Internal function for approving a proposal tally.
    /// @param _proposalId The ID of the proposal to approve.
    /// @dev The caller must be a committee member if the ONLY_COMMITTEE_APPROVE_TALLY flag is set.
    function _approveTally(uint256 _proposalId, bool _tryExecution) internal {
        if (!_isCommitteeMember(_msgSender())) {
            revert OnlyCommittee({
                sender: _msgSender()
            });
        }

        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.tally.length == 0) {
            revert InvalidTally(proposal.tally);
        }

        if (hasApprovedTally(_proposalId)) {
            revert TallyAlreadyApproved({
                approvals: proposal.approvers.length,
                minApprovals: pluginSettings.minTallyApprovals
            });
        }
        
        proposal.approvers.push(_msgSender());
        
        emit TallyApproved({proposalId: _proposalId});
        
        if (_tryExecution) {
            _checkTallyAndExecute(_proposalId);
        }
    }

    /// @inheritdoc IVocdoniVoting
    function executeProposal(uint256 _proposalId) public override {
        _executeProposal(_proposalId);
    }

    /// @notice Internal function for executing a proposal.
    /// @param _proposalId The ID of the proposal to execute.
    /// @dev The caller must be a committee member if the ONLY_COMMITTEE_EXECUTE flag is set.
    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];

        if (!_isProposalOnTallyPhase(proposal)) {
            revert ProposalNotInTallyPhase(
                proposal.parameters.startDate,
                proposal.parameters.endDate,
                proposal.parameters.expirationDate,
                block.timestamp
            );
        }
        
        _checkTallyAndExecute(_proposalId);
    }

    /// @notice Internal function to check if a proposal is on the tally phase.
    /// @param _proposal The proposal to check
    function _isProposalOnTallyPhase(Proposal storage _proposal) internal view returns (bool) {
        uint64 currentBlockTimestamp = uint64(block.timestamp);
        /// [... startDate ............ endDate ............ expirationDate ...]
        /// [............. Voting phase ....... Tally phase ...................]
        if (_proposal.parameters.startDate < currentBlockTimestamp &&
            _proposal.parameters.endDate <= currentBlockTimestamp &&
            _proposal.parameters.expirationDate > currentBlockTimestamp &&
            !_proposal.executed) {
            return true;
        }
        return false;
    }

    /// @notice Internal function to check the tally and execute a proposal if the tally
    ///         number of YES votes is greater than the tally number of NO votes.
    function _checkTallyAndExecute(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];

         if(proposal.tally.length == 0) {
            revert InvalidTally({
                tally: proposal.tally
            });
        }
        
        if (proposal.approvers.length < pluginSettings.minTallyApprovals) {
            revert NotEnoughApprovals({
                minApprovals: pluginSettings.minTallyApprovals,
                actualApprovals: proposal.approvers.length.toUint16()
            });
        }
        
        uint256 _currentParticipation = proposal.tally[0][0] + proposal.tally[0][1] + proposal.tally[0][2];
        if (_currentParticipation < pluginSettings.minParticipation) {
            revert MinParticipationNotReached({
                currentParticipation: _currentParticipation,
                minParticipation: pluginSettings.minParticipation
            });
        }
        
        uint256 _currentSupport = (RATIO_BASE - pluginSettings.supportThreshold) * proposal.tally[0][0];
        if (_currentSupport <= pluginSettings.supportThreshold * proposal.tally[0][1]) {
            revert SupportThresholdNotReached({
                currentSupport: _currentSupport,
                supportThreshold: pluginSettings.supportThreshold
            });
        }
    
        proposal.executed = true;
        _executeProposal(
            dao(),
            _proposalId,
            proposal.actions,
            proposal.allowFailureMap
        );
    }


    function _validateProposalDates(uint64 _startDate, uint64 _endDate, uint64 _expirationDate)
        internal
        view
        virtual
        returns(
        uint64 startDate,
        uint64 endDate,
        uint64 expirationDate
    ) {
        uint64 currentBlockTimestamp = block.timestamp.toUint64();
        // check proposal start date and set it to the current block timestamp if it is 0
        if (_startDate == 0) {
            startDate = currentBlockTimestamp;
        } else {
            startDate = _startDate;
            if (startDate < currentBlockTimestamp) {
                revert InvalidStartDate({
                    limit: currentBlockTimestamp,
                    actual: startDate
                });
            }
        }
        // check proposal end date and set it to the start date + min duration if it is 0
        uint64 earliestEndDate = startDate + pluginSettings.minDuration; 
        // Since `minDuration` is limited to 1 year, `startDate + minDuration`
        // can only overflow if the `startDate` is after `type(uint64).max - minDuration`. 
        // In this case, the proposal creation will revert and another date can be picked.
        if (_endDate == 0) {
            endDate = earliestEndDate;
        } else {
            endDate = _endDate;
            if (endDate < earliestEndDate) {
                revert InvalidEndDate({
                    limit: earliestEndDate,
                    actual: endDate
                });
            }
        }
        // check proposal expiration date and set it to the (endDate + min duration) if it is 0
        uint64 earliestExpirationDate = endDate + pluginSettings.minDuration;
        if (_expirationDate == 0) {
            expirationDate = earliestExpirationDate;
        } else {
            expirationDate = _expirationDate;
            if (expirationDate < earliestExpirationDate) {
                revert InvalidExpirationDate({
                    limit: earliestExpirationDate,
                    actual: expirationDate
                });
            }
        }
    }

    /// @notice Gets the plugin settings.
    /// @return The plugin settings.
    function getPluginSettings() public view returns (PluginSettings memory) {
        return pluginSettings;
    }

    /// @notice Returns true if msg.sender has approved the given proposal tally
    /// @param _proposalId The ID of the proposal.
    /// @return Whether the msg.sender has approved the proposal tally.
    function hasApprovedTally(uint256 _proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        for (uint16 i = 0; i < proposal.approvers.length; i++) {
            if (proposal.approvers[i] == _msgSender()) {
                return true;
            }
        }
        return false;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables
    ///         without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps]
    ///         (https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}