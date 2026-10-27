
export const repositoryIds = {
    IJurisdictionRepository: Symbol('IJurisdictionRepository'),
    IStaffUserRepository: Symbol('IStaffUserRepository'),
    IServiceRequestRepository: Symbol('IServiceRequestRepository'),
    IServiceRepository: Symbol('IServiceRepository'),
    IEventRepository: Symbol('IEventRepository'),
    ICommunicationRepository: Symbol('ICommunicationRepository'),
    IEmailStatusRepository: Symbol('IEmailStatusRepository'),
    ISmsStatusRepository: Symbol('ISmsStatusRepository'),
    IDepartmentRepository: Symbol('IDepartmentRepository'),
    IInboundMapRepository: Symbol('IInboundMapRepository'),
    IMessageDisambiguationRepository: Symbol('IMessageDisambiguationRepository'),
    ITemplateRepository: Symbol('ITemplateRepository'),
    IGeoRepository: Symbol('IGeoRepository'),
    ICitizenUserRepository: Symbol('ICitizenUserRepository'),
    IOtpCodeRepository: Symbol('IOtpCodeRepository'),
    INotificationRepository: Symbol('INotificationRepository'),
    IGrievanceRepository: Symbol('IGrievanceRepository'),
};

export const serviceIds = {
    IOutboundMessageService: Symbol('IOutboundMessageService'),
    IInboundMessageService: Symbol('IInboundMessageService'),
    IServiceRequestService: Symbol('IServiceRequestService'),
    IStaffUserService: Symbol('IStaffUserService'),
    ITemplateService: Symbol('ITemplateService'),
    IAuthService: Symbol('IAuthService'),
    INotificationService: Symbol('INotificationService'),
    IGrievanceService: Symbol('IGrievanceService'),
};

export const appIds = {
    AppConfig: Symbol('AppConfig'),
    Models: Symbol('Models'),
    Repositories: Symbol('Repositories'),
    OutboundMessageService: Symbol('OutboundMessageService'),
    ServiceRequestHookRunner: Symbol('ServiceRequestHookRunner'),
};
